package org.tensorflow.lite.examples.objectdetection.fragments;

import androidx.annotation.NonNull;
import androidx.navigation.ActionOnlyNavDirections;
import androidx.navigation.NavDirections;
import org.tensorflow.lite.examples.objectdetection.R;

public class CameraFragmentDirections {
  private CameraFragmentDirections() {
  }

  @NonNull
  public static NavDirections actionCameraToPermissions() {
    return new ActionOnlyNavDirections(R.id.action_camera_to_permissions);
  }
}
