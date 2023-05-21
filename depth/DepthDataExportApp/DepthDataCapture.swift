//
//  DepthDataCapture.swift
//  DepthDataExportApp
//
//

import Foundation
import AVFoundation
import Compression


class DepthDataCapture {
    let kErrorDomain = "DepthDataCapture" // The error domain used for this class.
    let maxNumberOfFrame = 250  // The maximum number of frames to capture.
    lazy var bufferSize = 640 * 480 * 2 * maxNumberOfFrame  // The size of the buffer to allocate.
    var dstBuffer: UnsafeMutablePointer<UInt8>? // The destination buffer to write the compressed data.
    var frameCount: Int64 = 0 // The number of frames captured.
    var outputURL: URL?  // The output URL where the compressed data will be saved.
    var compresserPtr: UnsafeMutablePointer<compression_stream>?  // The compression stream pointer used for compressing the data.
    var file: FileHandle?  // The file handle used to write the compressed data.
    var processingQ = DispatchQueue(label: "compression",qos: .userInteractive)  // The dispatch queue used for processing the compression.
    
    func reset() {
        frameCount = 0
        outputURL = nil
        
        if self.dstBuffer != nil {
            self.dstBuffer!.deallocate()
            self.dstBuffer = nil
        }
        
        if self.compresserPtr != nil {
            compression_stream_destroy(self.compresserPtr!)
            self.compresserPtr = nil
        }
        if self.file != nil {
            self.file!.closeFile()
            self.file = nil
        }
    }
    func prepareForRecording() {
        reset()
        // Create a zip file to store the output, overwriting any existing file with the same name
        // If a file with the same name already exists, it will be deleted
        let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0] as NSString
        self.outputURL = URL(fileURLWithPath: documentsPath.appendingPathComponent("Depth"))
        FileManager.default.createFile(atPath: self.outputURL!.path, contents: nil, attributes: nil)
        self.file = FileHandle(forUpdatingAtPath: self.outputURL!.path)
        if self.file == nil {
            NSLog("Cannot create file at: \(self.outputURL!.path)")
            return
        }
        
        compresserPtr = UnsafeMutablePointer<compression_stream>.allocate(capacity: 1)
        compression_stream_init(compresserPtr!, COMPRESSION_STREAM_ENCODE, COMPRESSION_ZLIB)
        dstBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        compresserPtr!.pointee.dst_ptr = dstBuffer!
        compresserPtr!.pointee.dst_size = bufferSize
        
        
    }
    func flush() {
        let nBytes = bufferSize - compresserPtr!.pointee.dst_size
        print("Writing \(nBytes)")
        let data = Data(bytesNoCopy: dstBuffer!, count: nBytes, deallocator: .none)
        self.file?.write(data)
    }
    
    func startRecording() throws {
        processingQ.async {
            self.prepareForRecording()
        }
    }
    func addPixelBuffers(pixelBuffer: CVPixelBuffer) {
        processingQ.async {
            if self.frameCount >= self.maxNumberOfFrame {
                print("Maxed Out")
                return
            }
            
            CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
            let add : UnsafeMutableRawPointer = CVPixelBufferGetBaseAddress(pixelBuffer)!
            self.compresserPtr!.pointee.src_ptr = UnsafePointer<UInt8>(add.assumingMemoryBound(to: UInt8.self))
            let height = CVPixelBufferGetHeight(pixelBuffer)
            self.compresserPtr!.pointee.src_size = CVPixelBufferGetBytesPerRow(pixelBuffer) * height
            let flags = Int32(0)
            let compression_status = compression_stream_process(self.compresserPtr!, flags)
            if compression_status != COMPRESSION_STATUS_OK {
                NSLog("Buffer compression retured: \(compression_status)")
                return
            }
            if self.compresserPtr!.pointee.src_size != 0 {
                NSLog("Compression library didnot take all data: \(compression_status)")
                return
            }
            CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)
            self.frameCount += 1
            print("handled \(self.frameCount) buffers")
        }
    }
    func finishRecording(success: @escaping ((URL) -> Void)) throws {
        processingQ.async {
            let flags = Int32(COMPRESSION_STREAM_FINALIZE.rawValue)
            self.compresserPtr!.pointee.src_size = 0
            let compression_status = compression_stream_process(self.compresserPtr!, flags)
            if compression_status != COMPRESSION_STATUS_END {
                NSLog("Error: Finish failed. compression retured: \(compression_status)")
                return
            }
            self.flush()
            DispatchQueue.main.sync {
                success(self.outputURL!)
            }
            self.reset()
        }
    }
}
