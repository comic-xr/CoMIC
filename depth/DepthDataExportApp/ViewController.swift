//
//  ContentView.swift
//  DepthDataExportApp
//
//

import SwiftUI
import RealityKit
import UIKit
import AVFoundation
import CoreVideo
import MobileCoreServices
import Accelerate

class ViewController: UIViewController, AVCaptureFileOutputRecordingDelegate, AVCaptureDepthDataOutputDelegate {
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
    }
    
    let Session = AVCaptureSession()
    let sessionOutput = AVCapturePhotoOutput()
    let movieFileOutput = AVCaptureMovieFileOutput()
    private let sessionQueue = DispatchQueue(label: "session queue", attributes: [], autoreleaseFrequency: .workItem)
    private enum SessionSetupResult {
        case success
        case notAuthorized
        case configurationFailed
    }
    private var setupResult: SessionSetupResult = .success
    var previewVideoLayer = AVCaptureVideoPreviewLayer()
    var isRecording = false
    private let depthDataOutput = AVCaptureDepthDataOutput()
    private let dataOutputQueue = DispatchQueue(label: "dataOutputQueue")
    private let depthdataCapture = DepthDataCapture()
    private var outputSynchronizer: AVCaptureDataOutputSynchronizer?
    @IBOutlet var cameraView: UIView!
    
    
    
    override func viewDidLoad() {
            super.viewDidLoad()
            
            // Check video authorization status, video access is required
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                // The user has previously granted access to the camera
                break
                
            case .notDetermined:
                /*
                 The user has not yet been presented with the option to grant video access
                 We suspend the session queue to delay session setup until the access request has completed
                 */
                sessionQueue.suspend()
                AVCaptureDevice.requestAccess(for: .video, completionHandler: { granted in
                    if !granted {
                        self.setupResult = .notAuthorized
                    }
                    self.sessionQueue.resume()
                })
                
            default:
                // The user has previously denied access
                setupResult = .notAuthorized
            }
            
        }
        func showThermalState(state: ProcessInfo.ThermalState) {
            DispatchQueue.main.async {
                var thermalStateString = "UNKNOWN"
                if state == .nominal {
                    thermalStateString = "NOMINAL"
                } else if state == .fair {
                    thermalStateString = "FAIR"
                } else if state == .serious {
                    thermalStateString = "SERIOUS"
                } else if state == .critical {
                    thermalStateString = "CRITICAL"
                }
                
                let message = NSLocalizedString("Thermal state: \(thermalStateString)", comment: "Alert message when thermal state has changed")
                let alertController = UIAlertController(title: "TrueDepthStreamer", message: message, preferredStyle: .alert)
                alertController.addAction(UIAlertAction(title: NSLocalizedString("OK", comment: "Alert OK button"), style: .cancel, handler: nil))
                self.present(alertController, animated: true, completion: nil)
            }
        }
        func thermalStateChanged(notification: NSNotification) {
            if let processInfo = notification.object as? ProcessInfo {
                showThermalState(state: processInfo.thermalState)
            }
        }
    override func viewWillAppear(_ animated: Bool) {
        if let device = AVCaptureDevice.default(.builtInTrueDepthCamera,for: .video, position: .front) {
                
            do {
                
                let input = try AVCaptureDeviceInput(device: device )
                
                if Session.canAddInput(input){
                    Session.sessionPreset = AVCaptureSession.Preset.photo
                    Session.addInput(input)
                    
                    if Session.canAddOutput(sessionOutput){
                        
                        Session.addOutput(sessionOutput)
                        
                        previewVideoLayer = AVCaptureVideoPreviewLayer(session: Session)
                        previewVideoLayer.videoGravity = AVLayerVideoGravity.resizeAspectFill
                        previewVideoLayer.connection?.videoOrientation = AVCaptureVideoOrientation.portrait
                        cameraView.layer.addSublayer(previewVideoLayer)
                        
                        previewVideoLayer.position = CGPoint(x: self.cameraView.frame.width / 2, y: self.cameraView.frame.height / 2)
                        previewVideoLayer.bounds = cameraView.frame
                    }
                    
                    // Add depth output
                    guard Session.canAddOutput(depthDataOutput) else { fatalError() }
                    Session.addOutput(depthDataOutput)
                    
                    if let connection = depthDataOutput.connection(with: .depthData) {
                        connection.isEnabled = true
                        depthDataOutput.isFilteringEnabled = false
                        depthDataOutput.setDelegate(self, callbackQueue: dataOutputQueue)
                    } else {
                        print("No AVCaptureConnection")
                    }
                    
                    depthdataCapture.prepareForRecording()
                    
                    Session.addOutput(movieFileOutput)
                    
                    DispatchQueue.global(qos: .userInitiated).async {
                        self.Session.startRunning()
                    }
                }
                
            } catch {
                print("--Error--")
            }
        }
    }
    func startRecording(){
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        let fileUrl = paths[0].appendingPathComponent("output.mov")
        movieFileOutput.startRecording(to: fileUrl, recordingDelegate: self)
        print(fileUrl.absoluteString)
        print("Recording started")
        self.isRecording = true
        
    }

    func stopRecording(){
        movieFileOutput.stopRecording()
        print("Stopped recording!")
        self.isRecording = false
        do {
            try depthdataCapture.finishRecording(success: { (url: URL) -> Void in
                print(url.absoluteString)
            })
        } catch {
            print("Error while finishing depth capture.")
        }
        
    }

    @IBAction func startPressed(_ sender: Any) {
        startRecording()
    }

    @IBAction func stopPressed(_ sender: Any) {
        stopRecording()
    }

    func depthDataOutput(_ output: AVCaptureDepthDataOutput, didOutput depthData: AVDepthData, timestamp: CMTime, connection: AVCaptureConnection) {
        // Write depth data to a file
        if(self.isRecording) {
            let ddm = depthData.depthDataMap
            depthdataCapture.addPixelBuffers(pixelBuffer: ddm)
        }
    }
    }
    

