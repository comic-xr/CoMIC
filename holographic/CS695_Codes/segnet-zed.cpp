/*
 * Copyright (c) 2017, NVIDIA CORPORATION. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

// OpenCV includes
#include <opencv2/opencv.hpp>

#include "gstCamera.h"
#include "glDisplay.h"

#include "commandLine.h"
#include "cudaMappedMemory.h"
#include "cudaRGB.h"
#include "segNet.h"
#include "loadImage.h"
#include <signal.h>

// ZED includes
#include <sl/Camera.hpp>
#include <unistd.h>



using namespace std;

cv::Mat slMat2cvMat(sl::Mat& input);
void printHelp();


bool signal_recieved = false;

void sig_handler(int signo)
{
	if( signo == SIGINT )
	{
		printf("received SIGINT\n");
		signal_recieved = true;
	}
}

int usage()
{
	printf("usage: segnet-zed [-h] [--network NETWORK] [--camera CAMERA]\n");
	printf("                     [--width WIDTH] [--height HEIGHT]\n");
	printf("                     [--alpha ALPHA] [--filter-mode MODE]\n");
	printf("                     [--ignore-class CLASS]\n\n");
	printf("Segment and classify a live camera stream using a semantic segmentation DNN.\n\n");
	printf("optional arguments:\n");
	printf("  --help            show this help message and exit\n");
	printf("  --network NETWORK pre-trained model to load (see below for options)\n");
	printf("  --camera CAMERA   index of the MIPI CSI camera to use (e.g. CSI camera 0),\n");
	printf("                    or for VL42 cameras the /dev/video device to use.\n");
     printf("                    by default, MIPI CSI camera 0 will be used.\n");
	printf("  --width WIDTH     desired width of camera stream (default: 1280 pixels)\n");
	printf("  --height HEIGHT   desired height of camera stream (default: 720 pixels)\n");
	printf("  --alpha ALPHA     overlay alpha blending value, range 0-255 (default: 120)\n");
	printf("  --filter-mode MODE   filtering mode used during visualization,\n");
	printf("                       options are 'point' or 'linear' (default: 'linear')\n");
	printf("  --ignore-class CLASS optional name of class to ignore when classifying\n");
	printf("                       the visualization results (default: 'void')\n\n");
	printf("%s\n", segNet::Usage());

	return 0;
}

/**
* Conversion function between sl::Mat and cv::Mat
**/
cv::Mat slMat2cvMat(sl::Mat& input) {
    // Mapping between MAT_TYPE and CV_TYPE
    int cv_type = -1;
    switch (input.getDataType()) {
        case sl::MAT_TYPE::F32_C1: cv_type = CV_32FC1; break;
        case sl::MAT_TYPE::F32_C2: cv_type = CV_32FC2; break;
        case sl::MAT_TYPE::F32_C3: cv_type = CV_32FC3; break;
        case sl::MAT_TYPE::F32_C4: cv_type = CV_32FC4; break;
        case sl::MAT_TYPE::U8_C1: cv_type = CV_8UC1; break;
        case sl::MAT_TYPE::U8_C2: cv_type = CV_8UC2; break;
        case sl::MAT_TYPE::U8_C3: cv_type = CV_8UC3; break;
        case sl::MAT_TYPE::U8_C4: cv_type = CV_8UC4; break;
        default: break;
    }

    // Since cv::Mat data requires a uchar* pointer, we get the uchar1 pointer from sl::Mat (getPtr<T>())
    // cv::Mat and sl::Mat will share a single memory structure
    return cv::Mat(input.getHeight(), input.getWidth(), cv_type, input.getPtr<sl::uchar1>(sl::MEM::CPU));
}

/**
* This function displays help in console
**/
void printHelp() {
    cout << " Press 's' to save Side by side images" << endl;
    cout << " Press 'p' to save Point Cloud" << endl;
    cout << " Press 'd' to save Depth image" << endl;
    cout << " Press 'm' to switch Point Cloud format" << endl;
    cout << " Press 'n' to switch Depth format" << endl;
}


int main( int argc, char** argv )
{
	/*
	 * parse command line
	 */
	commandLine cmdLine(argc, argv);

	if( cmdLine.GetFlag("help") )
		return usage();


	/*
	 * attach signal handler
	 */
	if( signal(SIGINT, sig_handler) == SIG_ERR )
		printf("\ncan't catch SIGINT\n");


	/*
	 * create the camera device
	 */
	// Create a ZED camera object
    sl::Camera zed;

    // Set configuration parameters
    sl::InitParameters init_parameters;
    init_parameters.camera_resolution = sl::RESOLUTION::HD720;
    //init_parameters.depth_mode = DEPTH_MODE::ULTRA;
    //init_parameters.coordinate_units = UNIT::METER;

	// Open the camera
    sl::ERROR_CODE zed_open_state = zed.open(init_parameters);
    if (zed_open_state != sl::ERROR_CODE::SUCCESS) {
        cout<<"[Sample] Error Camera Open: "<< zed_open_state<<"\nExit program."<<endl;
        return -1;
    }

	// Set runtime parameters after opening the camera
    sl::RuntimeParameters runtime_parameters;
    runtime_parameters.sensing_mode = sl::SENSING_MODE::STANDARD;

    // Prepare new image size to retrieve half-resolution images
    sl::Resolution image_size = zed.getCameraInformation().camera_configuration.resolution;

	const uint32_t width = image_size.width;
	const uint32_t height = image_size.height;

	cv::Size process_size = cv::Size(height,width);


    // To share data between sl::Mat and cv::Mat, use slMat2cvMat()
    // Only the headers and pointer to the sl::Mat are copied, not the data itself
    sl::Mat image_zed(width, height, sl::MAT_TYPE::U8_C3);
    cv::Mat image_bgra = slMat2cvMat(image_zed);

	cv::Mat image_bgr = cv::Mat::zeros(height , width , CV_8UC3);


	/*
	 * create segmentation network
	 */
	segNet* net = segNet::Create(argc, argv);

	if( !net )
	{
		printf("segnet-zed:   failed to initialize imageNet\n");
		return 0;
	}

	// set alpha blending value for classes that don't explicitly already have an alpha
	net->SetOverlayAlpha(cmdLine.GetFloat("alpha", 120.0f));

	// get the desired alpha blend filtering mode
	const segNet::FilterMode filterMode = segNet::FilterModeFromStr(cmdLine.GetString("filter-mode", "linear"));

	// get the object class to ignore (if any)
	const char* ignoreClass = cmdLine.GetString("ignore-class", "void");


	/*
	 * allocate segmentation overlay output buffers
 	 */
	float* imgBGRGPU = NULL;
	float* imgBGRCPU = NULL;
	float* imgRGBA = NULL;
	float* imgRGBACPU = NULL;
	float* imgOverlay = NULL;
	float* imgOverlayCPU = NULL;
	float* imgMask    = NULL;

	if( !cudaAllocMapped((void**)&imgBGRCPU, (void**)&imgBGRGPU, width * height * sizeof(char) * 3) )
	{
		printf("segnet-zed:  failed to allocate CUDA memory for overlay image (%ux%u)\n", width, height);
		return 0;
	}
	if( !cudaAllocMapped((void**)&imgRGBACPU, (void**)&imgRGBA, width * height * sizeof(float) * 4) )
	{
		printf("segnet-zed:  failed to allocate CUDA memory for overlay image (%ux%u)\n", width, height);
		return 0;
	}
	if( !cudaAllocMapped((void**)&imgOverlayCPU, (void**)&imgOverlay, width * height * sizeof(float) * 4) )
	{
		printf("segnet-zed:  failed to allocate CUDA memory for overlay image (%ux%u)\n", width, height);
		return 0;
	}

	if( !cudaAllocMapped((void**)&imgMask, width/2 * height/2 * sizeof(float) * 4) )
	{
		printf("segnet-zed:  failed to allocate CUDA memory for mask image\n");
		return 0;
	}


	/*
	 * create openGL window
	 */
	glDisplay* display = glDisplay::Create();

	if( !display )
	 	printf("segnet-zed:  failed to create openGL display\n");


	printf("segnet-zed:  camera open for streaming\n");


	/*
	 * processing loop
	 */
	float confidence = 0.0f;

	while( !signal_recieved )
	{
		// capture RGBA image


		if (zed.grab(runtime_parameters) == sl::ERROR_CODE::SUCCESS) {

            // Retrieve the left image, depth image in half-resolution
            zed.retrieveImage(image_zed, sl::VIEW::LEFT, sl::MEM::CPU, image_size);
            // zed.retrieveImage(depth_image_zed, VIEW::DEPTH, MEM::CPU, new_image_size);

            // // Retrieve the RGBA point cloud in half-resolution
            // // To learn how to manipulate and display point clouds, see Depth Sensing sample
            // zed.retrieveMeasure(point_cloud, MEASURE::XYZRGBA, MEM::CPU, new_image_size);

            // // Display image and depth using cv:Mat which share sl:Mat data
            // cv::imshow("Image", image_ocv);
            // cv::imshow("Depth", depth_image_ocv);
			image_bgra = slMat2cvMat(image_zed);
			cv::cvtColor(image_bgra , image_bgr , cv::COLOR_BGRA2BGR);
			//cv::imwrite("test.jpg",image_process);
            // // Handle key event
            // cv::waitKey(10);
            // processKeyEvent(zed, key);
        }

		//cv::imwrite("test_0.jpg",image_bgr);
		memcpy((void*)imgBGRCPU , (void*)image_bgr.data , width * height * sizeof(char) * 3);

		if(CUDA_FAILED(cudaRGB8ToRGBA32((uchar3*)imgBGRGPU, (float4*)imgRGBA, width, height))){
			printf("segnet-zed:  failed to convert CUDA memory for imgBGRGPU (%ux%u)\n", width, height);
			continue;
		}

		// process the segmentation network
		if( !net->Process(imgRGBA, width, height, ignoreClass) )
		{
			printf("segnet-console:  failed to process segmentation\n");
			continue;
		}

		// generate overlay
		if( !net->Overlay(imgOverlay, width, height, filterMode) )
		{
			printf("segnet-console:  failed to process segmentation overlay.\n");
			continue;
		}

		// generate mask
		if( !net->Mask(imgMask, width/2, height/2, filterMode) )
		{
			printf("segnet-console:  failed to process segmentation mask.\n");
			continue;
		}

		//saveImageRGBA("out.jpg", (float4*)imgOverlayCPU, width, height);
		// update display
		if( display != NULL )
		{
			// begin the frame++++++++++++
			display->BeginRender();

			// render the images
			display->Render(imgOverlay, width, height);
			display->Render(imgMask, width/2, height/2, width);

			// update the status bar
			char str[256];
			sprintf(str, "TensorRT %i.%i.%i | %s | %s | Network %.0f FPS", NV_TENSORRT_MAJOR, NV_TENSORRT_MINOR, NV_TENSORRT_PATCH, net->GetNetworkName(), precisionTypeToStr(net->GetPrecision()), net->GetNetworkFPS());
			display->SetTitle(str);

			// present the frame
			display->EndRender();

			// check if the user quit
			if( display->IsClosed() )
				signal_recieved = true;
		}

		// wait for the GPU to finish
		CUDA(cudaDeviceSynchronize());

		// print out timing info
		net->PrintProfilerTimes();

		usleep(1000);
		//break;
	}


	/*
	 * destroy resources
	 */
	printf("segnet-zed:  shutting down...\n");

	zed.close();
	SAFE_DELETE(display);

	CUDA(cudaFreeHost(imgOverlayCPU));
	CUDA(cudaFreeHost(imgRGBACPU));
	CUDA(cudaFreeHost(imgBGRCPU));
	SAFE_DELETE(net);

	printf("segnet-zed:  shutdown complete.\n");
	return 0;
}
