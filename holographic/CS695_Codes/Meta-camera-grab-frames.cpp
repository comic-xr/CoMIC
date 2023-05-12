#include <librealsense2/rs.hpp>
#include <signal.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <iostream>

char *filename = "samples.bag";
int n_frames = 30;

// This Function handles the signal from the Camera.
void sigintHandler(int dummy) {
    std::cout << "\n Exiting \n " << std::endl;
    exit(0);
}

// Prints the command to run this program.
void print_usage() {
    printf("\nUsage: Meta-camera-grab-frames -f <samples.bag> -n <#frames>\n\n");
}

// Function to get Arguments from the terminal
void parseArgs(int argc, char** argv) {
    int c;
    while ((c = getopt(argc, argv, "hf:n:")) != -1) {
        switch(c) {
            case 'h':
                print_usage();
                exit(0);
            case 'f':
                filename = optarg;
                break;
            case 'n':
                n_frames = atoi(optarg);
                break;
        }
    }

    std::cout << "\Capturing " << n_frames << " to Filename: " << filename << std::endl;
}



int main (int argc, char** argv) {

    // Getting the Arguments from the command line/User.
    parseArgs(argc, argv);

    // establishing and terminting the camera Signal.
    signal(SIGINT, sigintHandler);

    // Object in which we will specify the pipe line settings.
    rs2::config cfg;
    // Disabling all of the previous streams in the pipeline.
    cfg.disable_all_streams();

    // enabling the pipeline to get the color stream from Realsense camera with 1920x1080 with 30 frames per second.
    cfg.enable_stream(RS2_STREAM_COLOR, 1920, 1080, RS2_FORMAT_RGB8, 30);

    // enabling the pipeline to get the depth stream from Realsense camera with 1280x720 with 30 frames per second.
    cfg.enable_stream(RS2_STREAM_DEPTH, 1280, 720, RS2_FORMAT_Z16, 30);

    // enabling pipe line to write in the file.
    cfg.enable_record_to_file(filename);

    // defining the pipeline
    rs2::pipeline pipe;

    // assinging the configurations to pipeline.
    rs2::pipeline_profile selection = pipe.start(cfg);


    for (int i = 0; i < n_frames; i++)
    {
        //It waits to execute the pipeline untill a frame. 
        rs2::frameset frames = pipe.wait_for_frames();
        if( (i+1)%30 == 0){
            std::cout << "Grabbing Frame:" << i+1 << "/" << n_frames << std::endl;
        }
    }

    pipe.stop();

    return 0;
}
