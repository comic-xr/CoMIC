#include <librealsense2/rs.hpp>
#include <pcl/point_cloud.h>
#include <pcl/visualization/pcl_visualizer.h>
#include <pcl/common/transforms.h>
#include <pcl/io/ply_io.h>
#include <pcl/filters/voxel_grid.h>
//#include "Meta/client.h"

#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <cstring>
#include <iostream>
#include <iomanip>
#include <signal.h>
#include <chrono>
#include <thread>

typedef pcl::PointCloud<pcl::PointXYZ> pointCloudXYZ;
typedef pcl::PointCloud<pcl::PointXYZRGB> pointCloudXYZRGB;
typedef std::chrono::high_resolution_clock clockTime;
typedef std::chrono::time_point<clockTime> timePoint;
typedef std::chrono::duration<double, std::milli> timeMilli;

const int NUM_CAMERAS = 1;

const int CLIENT_PORT = 8000;
const int SERVER_PORT = 9000;
const int BUF_SIZE = 5000000;
const int STITCHED_BUF_SIZE = 32000000;
const float CONV_RATE = 1000.0;
const char PULL_XYZ = 'Y';
const char PULL_XYZRGB = 'Z';
const std::string _SERVER_ADDR("tcp://192.168.1.112:1883");
const std::string TOPIC("orientation");
const std::string Meta_CLIENT_ID("sewing_machine");
const std::string IP_ADDRESS[8] = {"192.168.1.128", "192.168.1.142", "192.168.1.138", "192.168.1.114", 
                                   "192.168.1.109", "192.168.1.113", "192.168.1.149", "192.168.1.131"};

int loop_count = 1;
bool fast = false;
bool timer = false;
bool save = false;
bool visual = false;
bool clean = true;
int downsample = 1;
int framecount = 0;
int server_sockfd = 0;
int client_sockfd = 0;
int sockfd_array[NUM_CAMERAS];
short *pc_buf[NUM_CAMERAS];
short * stitched_buf;
Eigen::Matrix4f transform[NUM_CAMERAS];
std::thread Meta_thread[NUM_CAMERAS];
pcl::visualization::PCLVisualizer viewer("Pointcloud Viewer by Guan");



void sigintHandler(int dummy) {
    // client.disconnect();
    for (int i = 0; i < NUM_CAMERAS; i++) {
        close(sockfd_array[i]);
    }
    close(server_sockfd);
    close(client_sockfd);
}


void parseArgs(int argc, char** argv) {
    int c;
    while ((c = getopt(argc, argv, "hftsvd:n")) != -1) {
        switch(c) {
            
            case 'n':
                clean = false;
                break;
            case 'f':
                fast = true;
                break;
            
            case 't':
                timer = true;
                break;
            
            case 's':
                save = true;
                break;
            
            case 'v':
                visual = true;
                break;
            
            case 'd':
                downsample = atoi(optarg);
                break;
            default:
            case 'h':
                std::cout << "\nMulticamera pointcloud stitching" << std::endl;
                std::cout << "Usage: Meta-multicamera-client [options]\n" << std::endl;
                std::cout << "Options:" << std::endl;
                std::cout << " -h (help)        Display command line options" << std::endl;
                std::cout << " -f (fast)        Increases the frame rate at the expense of color" << std::endl;
                std::cout << " -t (timer)       Displays the runtime of certain functions" << std::endl;
                std::cout << " -s (save)        Saves 20 frames in a .ply format" << std::endl;
                std::cout << " -v (visualize)   Visualizes the pointclouds using PCL visualizer" << std::endl;
                std::cout << " -d (downsample)  Downsamples the pointcloud by the specified integer" << std::endl;
                exit(0);
        }
    }
}



int initSocket(int port, std::string ip_addr) {
    int sockfd;
    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(port);
    inet_pton(AF_INET, ip_addr.c_str(), &serv_addr.sin_addr);

    // Create socket
    if ((sockfd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        std::cerr << "Couldn't create socket" << std::endl;
        exit(EXIT_FAILURE);
    }

    if (connect(sockfd, (struct sockaddr *) &serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "Connection failed at " << ip_addr << "." << std::endl;
        exit(EXIT_FAILURE);
    }

    std::cout << "Connection made at " << sockfd << std::endl;
    return sockfd;
}

// Creates TCP server socket
int initServerSocket() {
    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_addr.s_addr = INADDR_ANY;
    serv_addr.sin_port = htons(SERVER_PORT);

    if ((server_sockfd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP)) < 0) {
        std::cerr << "\nSocket fd not received." << std::endl;
        exit(EXIT_FAILURE);
    }

    if (bind(server_sockfd, (struct sockaddr *) &serv_addr, sizeof(serv_addr)) < 0) {
        std::cerr << "\nBind failed" << std::endl;
        exit(EXIT_FAILURE);
    }

    if (listen(server_sockfd, 3) < 0) {
        std::cerr << "\nListen failed" << std::endl;
        exit(EXIT_FAILURE);
    }

    std::cout << "\nWaiting for VR Headset client..." << std::endl;

    if ((client_sockfd = accept(server_sockfd, NULL, NULL)) < 0) {
        std::cerr << "\nConnection failed" << std::endl;
        exit(EXIT_FAILURE);
    }

    std::cout << "Established connection with unity client_sock: " << client_sockfd << std::endl;
}

void sendPullRequest(int sockfd, char pull_char) {
    if (send(sockfd, &pull_char, 1, 0) < 0) {
        std::cerr << "Pull request failure from sockfd: " << sockfd << std::endl;
        exit(EXIT_FAILURE);
    }
}


void readNBytes(int sockfd, unsigned int n, void * buffer) {
    int total_bytes, bytes_read;
    total_bytes = 0;

    while (total_bytes < n) {
        if ((bytes_read = read(sockfd, buffer + total_bytes, n - total_bytes)) < 1) {
            std::cerr << "Receive failure" << std::endl;
            exit(EXIT_FAILURE);
        }

        total_bytes += bytes_read;
    }
}

pointCloudXYZRGB::Ptr convertBufferToPointCloudXYZRGB(short * buffer, int size) {
    int count = 0;
    pointCloudXYZRGB::Ptr new_cloud(new pointCloudXYZRGB);

    new_cloud->width = size / downsample;
    new_cloud->height = 1;
    new_cloud->is_dense = false;
    new_cloud->points.resize(new_cloud->width);

    for (int i = 0; i < size; i++) {
        if (i % downsample == 0) {
            new_cloud->points[count].x = (float)buffer[i * 5 + 0] / CONV_RATE;
            new_cloud->points[count].y = (float)buffer[i * 5 + 1] / CONV_RATE;
            new_cloud->points[count].z = (float)buffer[i * 5 + 2] / CONV_RATE;
            new_cloud->points[count].r = (uint8_t)(buffer[i * 5 + 3] & 0xFF);
            new_cloud->points[count].g = (uint8_t)(buffer[i * 5 + 3] >> 8);
            new_cloud->points[count].b = (uint8_t)(buffer[i * 5 + 4] & 0xFF);
            count++;
        }
    }
    
    return new_cloud;
}


int convertPointCloudXYZRGBToBuffer(pointCloudXYZRGB::Ptr cloud, short * buffer) {
    int size = 0;

    for (int i = 0; i < cloud->width; i++) {
        buffer[size * 5 + 0] = static_cast<short>(cloud->points[i].x * CONV_RATE);
        buffer[size * 5 + 1] = static_cast<short>(cloud->points[i].y * CONV_RATE);
        buffer[size * 5 + 2] = static_cast<short>(cloud->points[i].z * CONV_RATE);
        buffer[size * 5 + 3] = static_cast<short>(cloud->points[i].r) + static_cast<short>(cloud->points[i].g << 8);
        buffer[size * 5 + 4] = static_cast<short>(cloud->points[i].b);
      
        size++;
    }

    return size;
}


void updateCloudXYZRGB(int thread_num, int sockfd, pointCloudXYZRGB::Ptr cloud) {
    double update_total, convert_total;
    timePoint loop_start, loop_end, read_start, read_end_convert_start, convert_end;

    if (timer)
        read_start = std::chrono::high_resolution_clock::now();

    int size;

    readNBytes(sockfd, sizeof(int), (void *)&size);
    readNBytes(sockfd, size, (void *)pc_buf[thread_num]);
    sendPullRequest(sockfd, PULL_XYZRGB);

    if (timer)
        read_end_convert_start = std::chrono::high_resolution_clock::now();

    *cloud = *convertBufferToPointCloudXYZRGB(pc_buf[thread_num], size / sizeof(short) / 5);
    pcl::transformPointCloud(*cloud, *cloud, transform[thread_num]);

    if (timer) {
        convert_end = std::chrono::high_resolution_clock::now();
        std::cout << "updateCloud " << thread_num << ": " << timeMilli(convert_end - read_end_convert_start).count() << " ms" << std::endl;
    }
}

void send_stitchedXYZRGB(pointCloudXYZRGB::Ptr stitched_cloud) {
    char pull_request[1] = {0};


    if (recv(client_sockfd, pull_request, 1, 0) < 0) {
        std::cout << "Client disconnected" << std::endl;
        exit(0);
    }
    if (pull_request[0] == 'Z') {          
        int size = convertPointCloudXYZRGBToBuffer(stitched_cloud, &stitched_buf[0] + sizeof(short));
        size = 5 * size * sizeof(short);
        memcpy(stitched_buf, &size, sizeof(int));
        
        write(client_sockfd, (char *)stitched_buf, size + sizeof(int));
    }
    else {                                      
        std::cerr << "Faulty pull request" << std::endl;
        exit(EXIT_FAILURE);
    }
}

void readCloud(int thread_num, int * size) {
    int sockfd = sockfd_array[thread_num];

    readNBytes(sockfd, sizeof(int), (void *)size);
    readNBytes(sockfd, *size, (void *)pc_buf[thread_num]);
    *size /= sizeof(short);

    sendPullRequest(sockfd, PULL_XYZRGB);
}

void sendStitchToUnity() {
    int stitch_size = 0;
    int increment = 5 * downsample;
    int buf_len[8];
    char pull_request[1] = {0};
    short * Meta_buf = stitched_buf + 2;

    for (int i = 0; i < NUM_CAMERAS; i++) {
        Meta_thread[i] = std::thread(readCloud, i, &buf_len[i]);
    }

    for (int i = 0; i < NUM_CAMERAS; i++) {
        Meta_thread[i].join();

        for (int j = 0; j < buf_len[i]; j += increment) {
            memcpy((void *)(Meta_buf + stitch_size), (void *)(pc_buf[i] + j), 5 * sizeof(short));
            stitch_size += 5;
        }
    }

    stitch_size *= sizeof(short);
    memcpy(stitched_buf, &stitch_size, sizeof(int));

    if (recv(client_sockfd, pull_request, 1, 0) < 0) {
        std::cout << "Client disconnected" << std::endl;
        exit(0);
    }
    if (pull_request[0] == 'Z') {          
        write(client_sockfd, (char *)stitched_buf, stitch_size + sizeof(int));
    }
    else {                                      
        std::cerr << "Faulty pull request" << std::endl;
        exit(EXIT_FAILURE);
    }
}


void runStitching() {
    double total;
    timePoint stitch_start, stitch_end;
    while (1) {

        if (timer)
            stitch_start = std::chrono::high_resolution_clock::now();

        sendStitchToUnity();

        if (timer) {
            stitch_end = std::chrono::high_resolution_clock::now();

            double temp = timeMilli(stitch_end - stitch_start).count();
            total += temp;
            std::cout << "Stitching: " << total / loop_count << " ms, ";
            std::cout << "Frame: " << loop_count;
            loop_count++;
        }
    }
}

void visualize() {
    double total;
    timePoint stitch_start, stitch_end;
    std::vector <pointCloudXYZRGB::Ptr, Eigen::aligned_allocator <pointCloudXYZRGB::Ptr>> cloud_ptr(NUM_CAMERAS);
    pointCloudXYZRGB::Ptr stitched_cloud(new pointCloudXYZRGB);
    pcl::visualization::PointCloudColorHandlerRGBField<pcl::PointXYZRGB> cloud_handler(stitched_cloud);

    viewer.setBackgroundColor(0.05, 0.05, 0.05, 0);
    viewer.addPointCloud(stitched_cloud, cloud_handler, "cloud");
    viewer.setPointCloudRenderingProperties(pcl::visualization::PCL_VISUALIZER_POINT_SIZE, 2, "cloud");

    for (int i = 0; i < NUM_CAMERAS; i++) {
        cloud_ptr[i] = pointCloudXYZRGB::Ptr(new pointCloudXYZRGB);
        sendPullRequest(sockfd_array[i], PULL_XYZRGB);
    }

    
    while (!viewer.wasStopped()) {
        if (timer)
            stitch_start = std::chrono::high_resolution_clock::now();
   
        stitched_cloud->clear();

        
        for (int i = 0; i < NUM_CAMERAS; i++) {
            Meta_thread[i] = std::thread(updateCloudXYZRGB, i, sockfd_array[i], cloud_ptr[i]);
        }
        
        for (int i = 0; i < NUM_CAMERAS; i++) {
            Meta_thread[i].join();
            *stitched_cloud += *cloud_ptr[i];
        }

        if (timer)
            stitch_end = std::chrono::high_resolution_clock::now();

        
        viewer.updatePointCloud(stitched_cloud, "cloud");
        viewer.spinOnce();

        if (timer) {
            double temp = timeMilli(stitch_end - stitch_start).count();
            total += temp;
            std::cout << "Stitch average: " << total / loop_count << " ms" << std::endl;
            loop_count++;
        }

        if (save) {
            std::string filename("pointclouds/stitched_cloud_"  + std::to_string(framecount) + ".ply");
            pcl::io::savePLYFileBinary(filename, *stitched_cloud);
            std::cout << "Saved frame " << framecount << std::endl;
            framecount++;
            if (framecount == 20)
                save = false;
        }
    }
}

int main(int argc, char** argv) {
    parseArgs(argc, argv);

    for (int i = 0; i < NUM_CAMERAS; i++) {

    }
    stitched_buf = (short *)malloc(sizeof(short) * STITCHED_BUF_SIZE);

    /* Reminder: how transformation matrices work :
                 |-------> This column is the translation, which represents the location of the camera with respect to the origin
    | r00 r01 r02 x |  \
    | r10 r11 r12 y |   }-> Replace the 3x3 "r" matrix on the left with the rotation matrix
    | r20 r21 r22 z |  /
    |   0   0   0 1 |    -> We do not use this line (and it has to stay 0,0,0,1)
    */

transform[0] << -0.69888007, -0.32213748,  0.63858757, -2.22900000,
                -0.71520905,  0.32290986, -0.61984291,  2.91800000,
                -0.00653159, -0.88991947, -0.45607091,  0.36400000,
                 0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[1] << -0.96127595,  0.09045863, -0.26031862,  0.31700000,
//                  0.27558764,  0.31552831, -0.90801615,  2.83300000,
//                  0.00000000, -0.94459469, -0.32823906,  0.38100000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[2] << -0.63305575,  0.28270490, -0.72063747,  2.80300000,
//                  0.77409926,  0.22724638, -0.59087175,  2.05500000,
//                 -0.00328008, -0.93189968, -0.36270128,  0.42100000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[3] <<  0.17021299,  0.28598815, -0.94299433,  2.51000000,
//                  0.98527137, -0.03349883,  0.16768470, -0.27300000,
//                  0.01636663, -0.95764743, -0.28747787,  0.35900000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[4] <<  0.72625904,  0.26139935, -0.63578155,  1.90900000,
//                  0.68735231, -0.26305364,  0.67701520, -2.81700000,
//                  0.00972668, -0.92869433, -0.37071853,  0.37900000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[5] <<  0.98744750,  0.00686296,  0.15779838, -0.57400000,
//                 -0.14665062, -0.33120318,  0.93209337, -2.69700000,
//                  0.05866025, -0.94353450, -0.32603930,  0.30900000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[6] <<  0.67295609,  0.40193638,  0.62094867, -2.97300000,
//                 -0.35777412, -0.55787451,  0.74884826, -0.41700000,
//                  0.64740079, -0.72610136, -0.23162261,  0.43400000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

// transform[7] <<  0.08929624, -0.21535297,  0.97244500, -2.95700000,
//                 -0.67610010, -0.73004840, -0.09958907, -0.33900000,
//                  0.73137872, -0.64857723, -0.21079074,  0.33800000,
//                  0.00000000,  0.00000000,  0.00000000,  1.00000000;

    for (int i = 0; i < NUM_CAMERAS; i++) {
        pc_buf[i] = (short *)malloc(sizeof(short) * BUF_SIZE);
        sockfd_array[i] = initSocket(CLIENT_PORT + i, IP_ADDRESS[i]);
    }

    if (!visual)
        initServerSocket();

    signal(SIGINT, sigintHandler);

    if (visual)
        visualize();
    else
        runStitching();

    // client.disconnect();
    for (int i = 0; i < NUM_CAMERAS; i++) {
        close(sockfd_array[i]);
    }
    close(server_sockfd);
    close(client_sockfd);
    
    return 0;
}


/*  Functions for XYZ pointclouds

    
    void runFastStitching() {
        timePoint loop_start, loop_end, stitch_start, stitch_end_viewer_start;
        timePoint transform_timer[NUM_CAMERAS * 2];
        std::vector <pointCloudXYZ::Ptr, Eigen::aligned_allocator <pointCloudXYZ::Ptr>> cloud_ptr(NUM_CAMERAS);
        pointCloudXYZ::Ptr stitched_cloud(new pointCloudXYZ);
        pcl::visualization::PointCloudColorHandlerCustom<pcl::PointXYZ> cloud_handler(stitched_cloud, 255, 255, 255);

        
        for (int i = 0; i < NUM_CAMERAS; i++) {
            sendPullRequest(sockfd_array[i], PULL_XYZ);
            cloud_ptr[i] = pointCloudXYZ::Ptr(new pointCloudXYZ);
        }
        viewer.setBackgroundColor(0.05, 0.05, 0.05, 0);
        viewer.addPointCloud(stitched_cloud, cloud_handler, "cloud");
        viewer.setPointCloudRenderingProperties(pcl::visualization::PCL_VISUALIZER_POINT_SIZE, 4, "cloud");

        // Loop until the visualizer is stopped (press 'q' to stop viewer)
        while (!viewer.wasStopped()) {
            if (timer)
                loop_start = std::chrono::high_resolution_clock::now();

            stitched_cloud->clear();

            if (timer)
                stitch_start = std::chrono::high_resolution_clock::now();

            // Spawn a thread for each camera and update pointcloud
            for (int i = 0; i < NUM_CAMERAS; i++) {
                Meta_thread[i] = std::thread(updateCloudXYZ, i, sockfd_array[i], cloud_ptr[i]);
            }

            // Wait for thread to finish running, then add cloud to stitched cloud
            for (int i = 0; i < NUM_CAMERAS; i++) {
                Meta_thread[i].join();
                *stitched_cloud += *cloud_ptr[i];
            }
for (int i = 0; i < NUM_CAMERAS; i++) {
            Meta_thread[i] = std::thread(updateCloudXYZRGB, i, sockfd_array[i], cloud_ptr[i]);
        }
        // Wait for thread to finish running, then add cloud to stitched cloud
        for (int i = 0; i < NUM_CAMERAS; i++) {
            Meta_thread[i].join();
            *stitched_cloud += *cloud_ptr[i];
        }
            if (timer)
                stitch_end_viewer_start = std::chrono::high_resolution_clock::now();

            
            if (visual) {
                viewer.updatePointCloud(stitched_cloud, "cloud");
                viewer.spinOnce();
            }

            if (timer) {
                loop_end = std::chrono::high_resolution_clock::now();
                std::cout << "Stitching: " << timeMilli(stitch_end_viewer_start - stitch_start).count() << " ms" << std::endl;
                std::cout << "Update Viewer: " << timeMilli(loop_end - stitch_end_viewer_start).count() << " ms" << std::endl;
                std::cout << "TOTAL FRAME TXFER: " << timeMilli(loop_end - loop_start).count() << " ms\n" << std::endl;
            }

            if (save) {
                std::string filename("pointclouds/stitched_cloud_"  + std::to_string(framecount) + ".ply");
                pcl::io::savePLYFileBinary(filename, *stitched_cloud);
                std::cout << "Saved frame " << framecount << std::endl;
                framecount++;
                if (framecount == 20)
                    save = false;
            }
        }
    }


    pointCloudXYZ::Ptr convertBufferToPointCloudXYZ(short * buffer, int size) {
        int count = 0;
        pointCloudXYZ::Ptr new_cloud(new pointCloudXYZ);

        new_cloud->width = size / downsample;
        new_cloud->height = 1;
        new_cloud->is_dense = false;
        new_cloud->points.resize(new_cloud->width);

        for (int i = 0; i < size; i++) {
            if (i % downsample == 0) {
                new_cloud->points[count].x = (float)buffer[i * 3 + 0] / CONV_RATE;
                new_cloud->points[count].y = (float)buffer[i * 3 + 1] / CONV_RATE;
                new_cloud->points[count].z = (float)buffer[i * 3 + 2] / CONV_RATE;
                count++;
            }
        }

        return new_cloud;
    }

    // Reads from the buffer and converts the data into a new XYZ pointcloud.
    void updateCloudXYZ(int thread_num, int sockfd, pointCloudXYZ::Ptr cloud) {
        timePoint loop_start, loop_end, read_start, read_end_convert_start, convert_end;

        if (timer)
            loop_start = std::chrono::high_resolution_clock::now();

        short * cloud_buf = (short *)malloc(sizeof(short) * BUF_SIZE);
        int size;

        if (timer)
            read_start = std::chrono::high_resolution_clock::now();

        // Read the first integer to determine the size being sent, then read in pointcloud
        readNBytes(sockfd, sizeof(int), (void *)&size);
        readNBytes(sockfd, size, (void *)&cloud_buf[0]);
        // Send pull_XYZ request after finished reading 
        sendPullRequest(sockfd, PULL_XYZ);

        if (timer)
            read_end_convert_start = std::chrono::high_resolution_clock::now();

        // Parse the pointcloud and perform transformation according to camera position
        *cloud = *convertBufferToPointCloudXYZ(&cloud_buf[0], size / sizeof(short) / 3);
        pcl::transformPointCloud(*cloud, *cloud, transform[thread_num]);

        if (timer)
            convert_end = std::chrono::high_resolution_clock::now();

        free(cloud_buf);

        if (timer) {
            loop_end = std::chrono::high_resolution_clock::now();
            std::cout << "   update XYZ: " << timeMilli(loop_end - loop_start).count() << " ms" << std::endl;
            std::cout << "      read:    " << timeMilli(read_end_convert_start - read_start).count() << " ms" << std::endl;
            std::cout << "      convert: " << timeMilli(convert_end - read_end_convert_start).count() << " ms" << std::endl;
        }
    }
*/
