import socket

# Define the IP address and port number of the server
SERVER_IP = '192.168.10.3'
SERVER_PORT = 12345

# Create a UDP socket
client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Send a message to the server
message = b"Hello, server!"
client_socket.sendto(message, (SERVER_IP, SERVER_PORT))
print(message)

# Receive messages from the server
while True:
    data, addr = client_socket.recvfrom(1073741824)
    #print("Received message from server:", data.decode())
    print(len(data))
