using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

#if !UNITY_EDITOR
    using Windows.Networking;
    using Windows.Networking.Sockets;
    using Windows.Storage.Streams;
#endif

//Able to act as a reciever 
public class TCP_SERVER : MonoBehaviour
{
    public String _input = "Waiting";

#if !UNITY_EDITOR
        StreamSocket socket;
        StreamSocketListener listener;
        String port;
        String message;
#endif

    // Use this for initialization
    void Start()
    {
#if !UNITY_EDITOR
        listener = new StreamSocketListener();
        port = "9090";
        listener.ConnectionReceived += Listener_ConnectionReceived;
        listener.Control.KeepAlive = false;

      
        Listener_Start();
#endif
    }

#if !UNITY_EDITOR
    private async void Listener_Start()
    {
        Debug.Log("Listener started");
        try
        {
            await listener.BindServiceNameAsync(port);
        }
        catch (Exception e)
        {
            Debug.Log("Error: " + e.Message);
        }

        Debug.Log("Listening");
    }

    private async void Listener_ConnectionReceived(StreamSocketListener sender, StreamSocketListenerConnectionReceivedEventArgs args)
    {
        try
        {
            byte[] data = new byte[1073741824]; // 1GB = 1073741824 bytes
            for (int i = 0; i < data.Length; i++)
            {
                data[i] = (byte)(i % 256); // fill the array with dummy data
            }

            using (var dw = new DataWriter(args.Socket.OutputStream))
            {
                while (true) { 
                dw.WriteBytes(data);
                await dw.StoreAsync();
                }
                dw.DetachStream();
            }
        }
        catch (Exception e)
        {
            Debug.Log("Error sending data: " + e.Message);
        }
    }

#endif

    void Update()
    {
       
    }
}