#imports

import socket
import struct

#receive data from client

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

ip_addr = '192.168.1.12'
port = 8888

server_socket.bind((ip_addr, port))
server_socket.listen(1)

client_socket, client_addr = server_socket.accept()
data, addr = client_socket.recvfrom(65535)

byte_list = data

num_sz = 2 #byte size of short - change to whatever data type used on client
num = int.from_bytes(data[:num_sz], 'big')
remaining_len = num_sz + 136 * num - len(data)

while remaining_len:
    #print(remaining_len)
    data, addr = client_socket.recvfrom(65535)
    byte_list += data
    remaining_len -= len(data)
#print(remaining_len)

#clean up

client_socket.close()
server_socket.close()

#reconstruct kpt and desc arrays from data

print(len(byte_list))

kpt = [struct.unpack('>f', byte_list[i : i + 4])[0] for i in range(2, 8 * num + 2, 4)]
kpt = [kpt[i : i + 2] for i in range(0, len(kpt), 2)]

desc = byte_list[8 * num + 2:]
desc = [desc[i : i + 128] for i in range(0, len(desc), 128)]

#testing

print(len(kpt))
print(len(desc))

print(kpt[0])
print(kpt[-1])

print(desc[0])
print(desc[-1])