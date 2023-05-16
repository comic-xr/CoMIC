# User Identification in 360 Degree Videos

This repository contains code used for identifying users based on latitude-longitude data recorded during watching 360 degree VR videos. 

## Datasets

The dataset used here comes from the paper:

Xu T, Han B, Qian F. Analyzing viewport prediction under different VR interactions[C]//Proceedings of the 15th International Conference on Emerging Networking Experiments And Technologies. 2019: 165-171.

## Project Structure
```
Repo Root
+-- classify_features_v5.py # Trains and evaluates several machine learning models on the task of identifying users from the data set.
		         # Has several configurable parameters described below.
							
+-- classify_features_v5_no_overlapping_window.py # change window setting
```

## Quick Start

Running `classify_features_v5.py` requires several Python modules, namely: 
- numpy
- scipy
- sklearn
- lightgbm
- xgboost

The dataset must be saved as the file "user_10.npy" in the same directory as the python script in order to run it.

The script will perform the following steps:
1. Create a set of sliding windows into the data;
2. Calculate feature vectors associated with each window;
3. Using the feature vectors, train several machine learning models to identify users;
4. Test how accurately the machine learning models can identify users.

The basic setup is that there are 11 videos with 10 users. Some subset (8) of the videos are used for training, and the remaining videos are used for testing.
Model: 
LightGBM (0.51)
Feature-based Model(0.76)

Parameters setting:
- `bins` represents how many feature vectors are concatenated into larger feature vectors (this seems to give better results).
- `freq` is the size of the sliding window used for feature extraction.
- `window_offset` is how much the sliding window is offset by when sliding. Set this equal to `freq` for no sliding window at all.
- `fft_resample_bins` is used to create feature vector elements from an FFT of the sliding window. In particular, the FFT is resampled into this many data points, and then added to the feature vector.
- `videos_train` is how many videos of the 11 videos to use for training (the rest will be used for testing).
- `swap_test` swaps which videos are used for training and testing. Example: if `videos_train = 8`, then the training videos will be the first 8 videos if `swap_test = False` and the last 8 videos if `swap_test = True`.
- `disable_xgboost` is a boolean parameter that, when set to True, will skip evaluating the xgboost model. The xgboost model performs pretty well, but usually worse than lightgbm, and is often very very slow.

