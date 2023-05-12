#include <cstring>
#include <iostream>
#include <chrono>

#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <signal.h>

#include <librealsense2/rs.hpp>

#define TIME_NOW    std::chrono::high_resolution_clock::now()
#define BUF_SIZE    4000000
#define CONV_RATE   1000

typedef std::chrono::high_resolution_clock clockTime;
typedef std::chrono::duration<double, std::milli> timeMilli;
typedef std::chrono::time_point<clockTime> timestamp;

char *filename = "samples.bag";
timestamp time_start, time_end;

// Defineing the function with all the parameters.
void sendXYZRGBPointcloud(rs2::points pts, rs2::video_frame color, short * buffer);

// This Function handles the signal.
oid sigintHandler(int dummy) {
    std::cout << "\n Exiting \n " << std::endl;
    exit(0);
}

// Prints the command to run this program.
void print_usage() {
    printf("\nUsage: Meta-camera-test-samples -f <samples.bag>\n\n");
}


// Function to get Arguments from the terminal
void parseArgs(int argc, char** argv) {
    int c;
    while ((c = getopt(argc, argv, "hf:")) != -1) {
        switch(c) {
            case 'h':
                print_usage();
                exit(0);
            case 'f':
                filename = optarg;
                break;
        }
    }

    std::cout << "\Reading Frames from File: " << filename << std::endl;
}



int main (int argc, char** argv) {

    // Getting the Arguments from the command line/User.
    parseArgs(argc, argv);

    // establishing and terminting the camera Signal.
    signal(SIGINT, sigintHandler);
    
    // Object in which we will specify the pipe line settings.
    rs2::config cfg;
    
    // defining the pipeline
    rs2::pipeline pipe;

    // Defining the object to save the point cloud.
    rs2::pointcloud pc;
    
    // enabling pipe line to write in the file.
    cfg.enable_device_from_file(filename);

    // Passing the configuration object to the pipeline. 
    pipe.start(cfg);
    // Getting the active profiles in the pipelines and details of the devices information. 
    rs2::device device = pipe.get_active_profile().get_device();
    std::cout << "Camera Info:" << device.get_info(RS2_CAMERA_INFO_NAME) << std::endl;

    // inisalizing the required parmeters for the time processing on the frames.
    int i = 0, last_frame = 0;
    double duration_sum = 0;
    short *buffer = (short *)malloc(sizeof(short) * BUF_SIZE);
    
   // Defining the frames object in which we can store the frames.
    rs2::frameset frames;
    
    
    while (true)
    {    
        //Checking If the pipeline dosen't have any frames in it.
        if (!pipe.poll_for_frames(&frames))
        {
            continue;
        }
        else
        {   // Getting the frame details and if the last_frame value is greater than current frame we are getting reapeted frames
            if (last_frame > frames.get_frame_number()) break;
            if (last_frame == frames.get_frame_number()) continue;
            
            std::cout << "Got Frame # " << last_frame << std::endl;
            last_frame = frames.get_frame_number();
            i++;

            time_start = TIME_NOW;

            // Getting the color and the depth data of the frames                                                     
            rs2::video_frame color = frames.get_color_frame();  
            rs2::depth_frame depth = frames.get_depth_frame();  

            // It's been used caluclate the point cloud from the depth data.
            rs2::points pts = pc.calculate(depth);              
                        
            // Mapping the colour to the point cloud to get the colored point cloud.
            pc.map_to(color);

            // Getting the size and time for converting the point cloud to buffer.       
            sendXYZRGBPointcloud(pts, color, buffer);   
            time_end = TIME_NOW;

            // Displaying the results.
            std::cout << "Frame Time: " << timeMilli(time_end - time_start).count() << " ms" << std::endl;
            std::cout << "FPS: " << 1000.0 / timeMilli(time_end - time_start).count() << "\n" << std::endl;
            duration_sum += timeMilli(time_end - time_start).count();
        }
    }
    
    pipe.stop();

    // Getting the color and the depth data of the frames  
    rs2::video_frame color = frames.get_color_frame();
    rs2::depth_frame depth = frames.get_depth_frame();

    // It's been used caluclate the point cloud from the depth data.
    rs2::points pts = pc.calculate(depth);

    // Displaying the results.
    std::cout << "### Video Frames H x W : " << color.get_height() << " x " << color.get_width() << std::endl;
    std::cout << "### Depth Frames H x W : " << depth.get_height() << " x " << depth.get_width() << std::endl;
    std::cout << "### # Points : " << pts.size() << std::endl;
    
    std::cout << "\n### Total Frames = " << i << std::endl;
    std::cout << "### AVG Frame Time: " << duration_sum / i << " ms" << std::endl;
    std::cout << "### AVG FPS: " << 1000.0 / (duration_sum / i) << "\n" << std::endl;
    return 0;
}


// Function which uses the values of the adjacent pixels values and find the color of the data. 
std::tuple<uint8_t, uint8_t, uint8_t> get_texcolor(rs2::video_frame texture, rs2::texture_coordinate texcoords) {
    const int w = texture.get_width(), h = texture.get_height();
    int x = std::min(std::max(int(texcoords.u*w + .5f), 0), w - 1);
    int y = std::min(std::max(int(texcoords.v*h + .5f), 0), h - 1);
    int idx = x * texture.get_bytes_per_pixel() + y * texture.get_stride_in_bytes();
    const auto texture_data = reinterpret_cast<const uint8_t*>(texture.get_data());

    return std::tuple<uint8_t, uint8_t, uint8_t>(texture_data[idx], texture_data[idx + 1], texture_data[idx + 2]);
}


// Converting the point cloud to buffer to send the data through the network.
int copyPointCloudXYZRGBToBuffer(rs2::points& pts, const rs2::video_frame& color, short * pc_buffer) {

    auto vertices = pts.get_vertices();
    auto tex_coords = pts.get_texture_coordinates();
    int size = 0;

    for (size_t i = 0; i < pts.size() && (5 * size + 2) < BUF_SIZE; i++) {
        
            std::tuple<uint8_t, uint8_t, uint8_t> current_color = get_texcolor(color, tex_coords[i]);

            pc_buffer[size * 5 + 0] = static_cast<short>(vertices[i].x * CONV_RATE);
            pc_buffer[size * 5 + 1] = static_cast<short>(vertices[i].y * CONV_RATE);
            pc_buffer[size * 5 + 2] = static_cast<short>(vertices[i].z * CONV_RATE);
            pc_buffer[size * 5 + 3] = (short)std::get<0>(current_color) + (short)(std::get<1>(current_color) << 8);
            pc_buffer[size * 5 + 4] = std::get<2>(current_color);

            size++;
        
    }

    return size;
}

// Function which sends size of the buffer after completing the conversition of data into buffer.
void sendXYZRGBPointcloud(rs2::points pts, rs2::video_frame color, short * buffer) {
    
    int size = copyPointCloudXYZRGBToBuffer(pts, color, &buffer[0] + sizeof(short));
    size = 5 * size * sizeof(short);
    memcpy(buffer, &size, sizeof(int));

    //send(client_sock, (char *)buffer, size + sizeof(int), 0);
}