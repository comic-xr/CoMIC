import socket
import time

# Set up the client-side socket
client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Set the server address and port number
server_address = ('192.168.10.3', 12345)

# Set the packet size and number of packets
packet_size = 100000  # bytes
num_packets = 10000000

# Generate some data to send in the packets
data = b'0123456789' * 6550  # 65500 of data

# Send continuous packets to the server
for i in range(num_packets):
    packet = data[:packet_size]
    #print('Sending packet', i+1, 'of size', len(packet), 'bytes')
    sent = client_socket.sendto(packet, server_address)
    time.sleep(0.000001)  # wait for 1 second before sending the next packet