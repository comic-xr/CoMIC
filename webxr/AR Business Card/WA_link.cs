using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using Mono.WebAssembly;

class ARBusinessCard
{
    static void Main()
    {
        // Load the WebAssembly binary
        byte[] wasmBytes = ReadEmbeddedResource("https://cdn.glitch.global/fae4f3fc-0f15-4ca3-8e80-0e9d5a5ac871/3DCards.wasm?v=1684025140876");

        // Define the OnTrackedImagesChanged functions you want to access
        [DllImport("__Internal")]
        public static extern void OnTrackedImagesChanged();

        // Instantiate and execute the WebAssembly binary
        using (Instance instance = new Instance(wasmBytes))
        {
            // Access and invoke OnTrackedImagesChanged 
            OnTrackedImagesChanged();
        }
    }

    // Helper method to read the WebAssembly binary from an embedded resource
    static byte[] ReadEmbeddedResource(string resourceName)
    {
        using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
        using (MemoryStream memoryStream = new MemoryStream())
        {
            stream.CopyTo(memoryStream);
            return memoryStream.ToArray();
        }
    }
}