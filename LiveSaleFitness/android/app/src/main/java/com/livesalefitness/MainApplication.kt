package com.livesalefitness

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.views.view.setEdgeToEdgeFeatureFlagOn
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = packages,
    )
  }

  private val packages: List<ReactPackage>
    get() =
      listOf(
        MainReactPackage(),
        com.reactnativecommunity.geolocation.GeolocationPackage(),
        com.airbnb.android.react.lottie.LottiePackage(),
        com.swmansion.gesturehandler.RNGestureHandlerPackage(),
        com.imagepicker.ImagePickerPackage(),
        com.razorpay.rn.RazorpayPackage(),
        com.swmansion.reanimated.ReanimatedPackage(),
        com.th3rdwave.safeareacontext.SafeAreaContextPackage(),
        com.reactnativecommunity.webview.RNCWebViewPackage(),
        com.swmansion.worklets.WorkletsPackage(),
      )

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }

    if (BuildConfig.IS_EDGE_TO_EDGE_ENABLED) {
      setEdgeToEdgeFeatureFlagOn()
    }
  }
}
