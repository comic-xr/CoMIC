import java.net.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.util.*;
import com.google.common.primitives.*;

public class Client {
	public static void main(String[]args) {
		try {
			InetAddress server = InetAddress.getByName("192.168.1.12");
			int port = 8888;

			Socket s = new Socket(server, port);
			OutputStream output = s.getOutputStream();
			
			short num = 10000;
			float[][] kpt = new float[num][2];
			byte[][] desc = new byte[num][128];
			
			//testing
			kpt[0] = new float[]{1.2f, 3.4f};
			kpt[num - 1] = new float[]{5.6f, 7.8f};
			
			desc[0][0] = 1;
			desc[0][127] = 2;
			desc[num - 1][0] = 3;
			desc[num - 1][127] = 4;
			
			byte[] num_bytes = ByteBuffer.allocate(Short.BYTES).putShort(num).array();
			ArrayList<Byte> list = new ArrayList<>(Bytes.asList(num_bytes));
			
			//append kpt and desc as Byte array to list
			
			byte[] kpt_bytes = new byte[num * 2 * Float.BYTES];
			ByteBuffer.wrap(kpt_bytes).asFloatBuffer().put(Floats.concat(kpt));
			list.addAll(Bytes.asList(kpt_bytes));
			
			byte[] desc_bytes = Bytes.concat(desc);
			list.addAll(Bytes.asList(desc_bytes));
			
			//convert list to primitive byte array
			
			output.write(Bytes.toArray(list));
		
			s.close();
		} 
		catch (IOException e) {
			System.out.println(e.getMessage());
		}
	}
}