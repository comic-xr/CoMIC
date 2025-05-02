package org.tensorflow.lite.examples.objectdetection;

import java.lang.System;

@kotlin.Metadata(mv = {1, 6, 0}, k = 1, d1 = {"\u0000>\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u0007\n\u0000\n\u0002\u0010\b\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u000e\n\u0002\u0018\u0002\n\u0002\b\u0007\n\u0002\u0010\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0005\u0018\u0000 )2\u00020\u0001:\u0002)*BI\u0012\b\b\u0002\u0010\u0002\u001a\u00020\u0003\u0012\b\b\u0002\u0010\u0004\u001a\u00020\u0005\u0012\b\b\u0002\u0010\u0006\u001a\u00020\u0005\u0012\b\b\u0002\u0010\u0007\u001a\u00020\u0005\u0012\b\b\u0002\u0010\b\u001a\u00020\u0005\u0012\u0006\u0010\t\u001a\u00020\n\u0012\b\u0010\u000b\u001a\u0004\u0018\u00010\f\u00a2\u0006\u0002\u0010\rJ\u0006\u0010\"\u001a\u00020#J\u0016\u0010$\u001a\u00020#2\u0006\u0010%\u001a\u00020&2\u0006\u0010\'\u001a\u00020\u0005J\u0006\u0010(\u001a\u00020#R\u0011\u0010\t\u001a\u00020\n\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000e\u0010\u000fR\u001a\u0010\u0007\u001a\u00020\u0005X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0010\u0010\u0011\"\u0004\b\u0012\u0010\u0013R\u001a\u0010\b\u001a\u00020\u0005X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0014\u0010\u0011\"\u0004\b\u0015\u0010\u0013R\u001a\u0010\u0006\u001a\u00020\u0005X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0016\u0010\u0011\"\u0004\b\u0017\u0010\u0013R\u001a\u0010\u0004\u001a\u00020\u0005X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0018\u0010\u0011\"\u0004\b\u0019\u0010\u0013R\u0010\u0010\u001a\u001a\u0004\u0018\u00010\u001bX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0013\u0010\u000b\u001a\u0004\u0018\u00010\f\u00a2\u0006\b\n\u0000\u001a\u0004\b\u001c\u0010\u001dR\u001a\u0010\u0002\u001a\u00020\u0003X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u001e\u0010\u001f\"\u0004\b \u0010!\u00a8\u0006+"}, d2 = {"Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper;", "", "threshold", "", "numThreads", "", "maxResults", "currentDelegate", "currentModel", "context", "Landroid/content/Context;", "objectDetectorListener", "Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper$DetectorListener;", "(FIIIILandroid/content/Context;Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper$DetectorListener;)V", "getContext", "()Landroid/content/Context;", "getCurrentDelegate", "()I", "setCurrentDelegate", "(I)V", "getCurrentModel", "setCurrentModel", "getMaxResults", "setMaxResults", "getNumThreads", "setNumThreads", "objectDetector", "Lorg/tensorflow/lite/task/vision/detector/ObjectDetector;", "getObjectDetectorListener", "()Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper$DetectorListener;", "getThreshold", "()F", "setThreshold", "(F)V", "clearObjectDetector", "", "detect", "image", "Landroid/graphics/Bitmap;", "imageRotation", "setupObjectDetector", "Companion", "DetectorListener", "app_debug"})
public final class ObjectDetectorHelper {
    private float threshold;
    private int numThreads;
    private int maxResults;
    private int currentDelegate;
    private int currentModel;
    @org.jetbrains.annotations.NotNull()
    private final android.content.Context context = null;
    @org.jetbrains.annotations.Nullable()
    private final org.tensorflow.lite.examples.objectdetection.ObjectDetectorHelper.DetectorListener objectDetectorListener = null;
    private org.tensorflow.lite.task.vision.detector.ObjectDetector objectDetector;
    @org.jetbrains.annotations.NotNull()
    public static final org.tensorflow.lite.examples.objectdetection.ObjectDetectorHelper.Companion Companion = null;
    public static final int DELEGATE_CPU = 0;
    public static final int DELEGATE_GPU = 1;
    public static final int DELEGATE_NNAPI = 2;
    public static final int MODEL_MOBILENETV1 = 0;
    public static final int MODEL_EFFICIENTDETV0 = 1;
    public static final int MODEL_EFFICIENTDETV1 = 2;
    public static final int MODEL_EFFICIENTDETV2 = 3;
    
    public ObjectDetectorHelper(float threshold, int numThreads, int maxResults, int currentDelegate, int currentModel, @org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.Nullable()
    org.tensorflow.lite.examples.objectdetection.ObjectDetectorHelper.DetectorListener objectDetectorListener) {
        super();
    }
    
    public final float getThreshold() {
        return 0.0F;
    }
    
    public final void setThreshold(float p0) {
    }
    
    public final int getNumThreads() {
        return 0;
    }
    
    public final void setNumThreads(int p0) {
    }
    
    public final int getMaxResults() {
        return 0;
    }
    
    public final void setMaxResults(int p0) {
    }
    
    public final int getCurrentDelegate() {
        return 0;
    }
    
    public final void setCurrentDelegate(int p0) {
    }
    
    public final int getCurrentModel() {
        return 0;
    }
    
    public final void setCurrentModel(int p0) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final android.content.Context getContext() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final org.tensorflow.lite.examples.objectdetection.ObjectDetectorHelper.DetectorListener getObjectDetectorListener() {
        return null;
    }
    
    public final void clearObjectDetector() {
    }
    
    public final void setupObjectDetector() {
    }
    
    public final void detect(@org.jetbrains.annotations.NotNull()
    android.graphics.Bitmap image, int imageRotation) {
    }
    
    @kotlin.Metadata(mv = {1, 6, 0}, k = 1, d1 = {"\u00000\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010!\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\t\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\bf\u0018\u00002\u00020\u0001J\u0010\u0010\u0002\u001a\u00020\u00032\u0006\u0010\u0004\u001a\u00020\u0005H&J0\u0010\u0006\u001a\u00020\u00032\u000e\u0010\u0007\u001a\n\u0012\u0004\u0012\u00020\t\u0018\u00010\b2\u0006\u0010\n\u001a\u00020\u000b2\u0006\u0010\f\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\rH&\u00a8\u0006\u000f"}, d2 = {"Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper$DetectorListener;", "", "onError", "", "error", "", "onResults", "results", "", "Lorg/tensorflow/lite/task/vision/detector/Detection;", "inferenceTime", "", "imageHeight", "", "imageWidth", "app_debug"})
    public static abstract interface DetectorListener {
        
        public abstract void onError(@org.jetbrains.annotations.NotNull()
        java.lang.String error);
        
        public abstract void onResults(@org.jetbrains.annotations.Nullable()
        java.util.List<org.tensorflow.lite.task.vision.detector.Detection> results, long inferenceTime, int imageHeight, int imageWidth);
    }
    
    @kotlin.Metadata(mv = {1, 6, 0}, k = 1, d1 = {"\u0000\u0014\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0007\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000b"}, d2 = {"Lorg/tensorflow/lite/examples/objectdetection/ObjectDetectorHelper$Companion;", "", "()V", "DELEGATE_CPU", "", "DELEGATE_GPU", "DELEGATE_NNAPI", "MODEL_EFFICIENTDETV0", "MODEL_EFFICIENTDETV1", "MODEL_EFFICIENTDETV2", "MODEL_MOBILENETV1", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}