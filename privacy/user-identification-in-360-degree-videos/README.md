# User Identification in 360 Degree Videos

This repository contains code used for evaluating the possibility of identifying users based on latitude-longitude data recorded during watching 360 degree VR videos. 

## Repositories Utilized in this Project

The dataset used here comes from the paper Xu T, Han B, Qian F. Analyzing viewport prediction under different VR interactions[C]//Proceedings of the 15th International Conference on Emerging Networking Experiments And Technologies. 2019: 165-171.

## Project Structure
```
Repo Root
+-- classify_features_v5.py # Trains and evaluates several machine learning models
                            # on the task of identifying users from the data set.
							# Has several configurable parameters described below.
							
+-- classify_features_v5_no_overlapping_window.py # Mostly identical to the other script, see Notes
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
1. Create a set of sliding windows into the data
2. Calculate feature vectors associated with each window
3. Using the feature vectors, train several machine learning models to identify users
4. Test how accurately the machine learning models can identify users

The basic setup is that there are 11 videos with 10 users. Some subset of the videos are used for training, and the remaining videos are used for testing.

At the top of the `classify_features_v5.py` file there are several tweakable parameters:
- `bins` represents how many feature vectors are concatenated into larger feature vectors (this seems to give better results).
- `freq` is the size of the sliding window used for feature extraction.
- `window_offset` is how much the sliding window is offset by when sliding. Set this equal to `freq` for no sliding window at all.
- `fft_resample_bins` is used to create feature vector elements from an FFT of the sliding window. In particular, the FFT is resampled into this many data points, and then added to the feature vector.
- `videos_train` is how many videos of the 11 videos to use for training (the rest will be used for testing).
- `swap_test` swaps which videos are used for training and testing. Example: if `videos_train = 8`, then the training videos will be the first 8 videos if `swap_test = False` and the last 8 videos if `swap_test = True`.
- `disable_xgboost` is a boolean parameter that, when set to True, will skip evaluating the xgboost model. The xgboost model performs pretty well, but usually worse than lightgbm, and is often very very slow.

Once run, the script will print two accuracy scores.

Each machine learning model is trained on some feature vector corresponding to the sliding windows taken from the original videos. So, the basic accuracy score simply tests how many feature vectors it identified as belonging to the correct user.

However, we know that a bunch of feature vectors all come from the same user, due to the way we've constructed them. So, we also evaluate the mode of all of the guessed users corresponding with a single actual user. This mode is tested separately, because of course, taking the most-often-guessed user for a bunch of feature vectors coming from the same user does generally improve our chances of guessing the correct user.

(In particular, with the script parameters provided in `classify_features_v5.py`, lightgbm will identify feature vectors with an accuracy of 0.51, and mode of feature vectors with an accuracy of 0.76).

## Notes

One possible limitation of the script is that the sliding windows are, if I am not mistaken, being performed over adjacent videos. This means that, for example, some of the test data may "leak" into the training data.

This can be fixed simply by disabling the sliding windows from overlapping at all, by setting the `freq` parameter equal to the `window_offset` parameter.

The provided script `classify_features_v5_no_overlapping_window.py` is identical to `classify_features_v5.py`, with only different parameters set. In particular, it no longer uses a sliding window with any overlaps. It doesn't produce quite as accurate of classification as `classify_features_v5.py`, but it does avoid any strange issues due to the sliding window.