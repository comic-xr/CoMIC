import socket
import time

HOST = "192.168.10.3"
PORT = 9090

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((HOST, PORT))

    for i in range(20):
        start_time = time.time()
        total_data = b""
        while time.time() - start_time < 1:
            data = s.recv(10737418240) # Limit the amount of data to 4KB
            if not data:
                break
            total_data += data
        print(f"Received {len(total_data)} bytes in {time.time() - start_time:.3f} seconds")