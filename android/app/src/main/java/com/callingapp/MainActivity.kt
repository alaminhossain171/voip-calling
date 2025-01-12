package com.callingapp

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import io.wazo.callkeep.RNCallKeepModule // Add this import
import androidx.annotation.NonNull // For annotations
import android.content.pm.PackageManager // For handling permissions
import android.os.Bundle // For saved instance state

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "CallingApp"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Handle permission results for RNCallKeep
   */
  override fun onRequestPermissionsResult(
    requestCode: Int,
    @NonNull permissions: Array<String>,
    @NonNull grantResults: IntArray
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode == RNCallKeepModule.REQUEST_READ_PHONE_STATE) {
      RNCallKeepModule.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
  }
}
