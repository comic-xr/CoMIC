import numpy as np
import scipy.stats
import scipy.signal
from sklearn.metrics import accuracy_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier

# Number of individual feature vectors that are concatenated into one larger
# vector. (suggested: 10)
bins = 10

# Size of the sliding window used to extract features. (suggested: 200)
freq = 200

# How much the sliding window is slided by at a time. (suggested: 30)
# Set this equal to 'freq' to ensure all windows are separate.
# (if setting equal to 'freq', a value of 100 seems reasonable...)
window_offset = 30

# Number of fft bins to use as features in the feature vector.
# (seemingly approximately best, but slow: 64)
fft_resample_bins = 64 # See stat_features

users = 10
videos = 11

# Original value: 8
videos_train = 8
videos_test = videos - videos_train

# Whether videos_test will be formed of data from the start of the array or the end.
swap_test = False

# Whether to disable xgboost.
disable_xgboost = False

print(f'--- running classify_features_v5.py ---\n\tbins = {bins}\n\tfreq = {freq}\n\twindow_offset = {window_offset}\n\tfft bins as features = {fft_resample_bins}\n\tvideos_train = {videos_train}\n\tswap_test = {swap_test}\n\tdisable_xgboost = {disable_xgboost}') 

data = np.load('user_10.npy', allow_pickle=True)



min_a = 11000
max_a = 29331



s_chunk = int(min_a/freq)
# latitude and logitude
num_features = 2

# cut
data_cut = np.array([subarray[: min_a] for subarray in np.ravel(data)])
data_cut = data_cut[:, :, 3:5]
data_cut = data_cut.astype(dtype = np.float32)

win_count = int(1 + (data_cut.shape[1] - freq) / window_offset)

# Now, we need to reduce the window count so that we will actually be able to
# bin the data later. win_count must be divisible by bins.
win_count = int(win_count / bins) * bins

total_data_length = (win_count - 1) * window_offset + freq
# Truncate the data so that we can bin it later
data_cut = data_cut[:, :total_data_length, :]

#data_reshape = data_cut.reshape(users, videos*s_chunk, freq, num_features)
#data_reshape = data_reshape.astype(dtype = np.float32)


# Window the data with a sliding window.
# Must compute the strides manually
# As recommended by as_strides documentation: use the existing strides.
stride_last = data_cut.strides[2]
stride_points = data_cut.strides[1]

data_windowed = np.lib.stride_tricks.as_strided(data_cut, (users, win_count * videos, freq, num_features), (data_cut.shape[1] * videos * stride_points, window_offset * stride_points, stride_points, stride_last))

def mean_crossing_rate(data, data_mean):
    # Need mean in a form where we can subtract it from all data points
    mean_rep = np.reshape(data_mean, (data_mean.shape[0], data_mean.shape[1], 1, data_mean.shape[2]))
    mean_rep = np.repeat(mean_rep, data.shape[2], axis=2)
    
    # Get the sign of each data point wrt the mean
    d_sign = np.sign(data - mean_rep)
    
    # Compute the differences between signs, then take absolute value
    d_diff = np.abs(np.diff(d_sign, axis=2))
    
    # Mean crossing rate is then the average crossing, but we multiply by 0.5
    # because (1 - (-1)) is 2 and we want it to be 1
    return np.mean(0.5 * d_diff, axis=2)

def stat_features(reshaped_data):
    data_min = np.amin(reshaped_data, axis=2)
    data_max = np.amax(reshaped_data, axis=2)
    data_std = np.std(reshaped_data, axis=2)
    data_mean = np.mean(reshaped_data, axis=2)
    data_med = np.median(reshaped_data, axis=2)
    data_variance = np.var(reshaped_data, axis=2)
    data_range = np.ptp(reshaped_data, axis=2)
    data_rms = np.sqrt(np.mean(reshaped_data**2, axis = 2))
    data_iqr = scipy.stats.iqr(reshaped_data, axis=2)
    data_skewness = scipy.stats.skew(reshaped_data, axis=2)
    data_kurtosis = scipy.stats.kurtosis(reshaped_data, axis=2)
    data_mcr = mean_crossing_rate(reshaped_data, data_mean)
    
    # FFT notes:
    # It seems like fft is slightly better than rfft most of the time, in my
    # experiments so far.
    # Use numpy.abs() to extract the magnitude (i.e. frequency info), we cannot
    # train with complex data
    data_fft = np.abs(np.fft.fft(reshaped_data, axis=2))
    #fft_min = np.amin(data_fft, axis=2)
    #fft_max = np.amax(data_fft, axis=2)
    #fft_std = np.std(data_fft, axis=2)
    fft_mean = np.mean(data_fft, axis=2) # Frequency domain features...?
    fft_iqr = scipy.stats.iqr(data_fft, axis=2)
    fft_skewness = scipy.stats.skew(data_fft, axis=2)
    fft_kurtosis = scipy.stats.kurtosis(data_fft, axis=2)
    
    # Additional FFT features: the fft bins themselves. Resample the fft into
    # a small number of bins that we can use as features.
    global fft_resample_bins
    global freq
    
    if fft_resample_bins == data_fft.shape[2]:
        # If the resample bins is set to the same as the chunk size... then just
        # directly use the fft data.
        # Note that the velocity and acceleration arrays are both smaller than
        # the position array, and so will have to be slightly upsampled in this
        # case.
        fft_features = data_fft.reshape(data_fft.shape[0], data_fft.shape[1], num_features * data_fft.shape[2])
    else:
        fft_features = scipy.signal.resample(data_fft, fft_resample_bins, axis=2, domain='freq')
        fft_features = fft_features.reshape(fft_features.shape[0], fft_features.shape[1], num_features * fft_resample_bins)
    
    return np.concatenate((data_min, data_max, data_std, data_mean, data_med, data_variance, data_range, data_rms, data_iqr, data_skewness, data_kurtosis, data_mcr, fft_mean, fft_iqr, fft_skewness, fft_kurtosis, fft_features), axis=2)


data_vel = np.diff(data_windowed, axis=2)
data_accel = np.diff(data_vel, axis=2)

data_featurization=np.concatenate((stat_features(data_windowed), stat_features(data_vel), stat_features(data_accel)), axis=2)

print(f"Finished reshaping data (final shape: {data_featurization.shape}). Starting training");

if swap_test:
    #data_train = data_featurization[:, ((videos - videos_train) * win_count):, :]
    #data_test = data_featurization[:, 0:((videos - videos_train) * win_count), :]
    data_test = data_featurization[:, 0:(videos_test * win_count), :]
    data_train = data_featurization[:, (videos_test * win_count):, :]
else:
    data_train = data_featurization[:, 0:(videos_train * win_count), :]
    data_test = data_featurization[:, (videos_train * win_count):, :]

stat_features_count = 16
# num_features = latitutde, longitude    x (pos, vel, acc)   x stat_features (include direct fft bins)
feature_vector_length = num_features * 3 * (stat_features_count + fft_resample_bins)

# 10 x 3 x 2 = 60-dimensional feature vector: (latitude, longitude) x (pos, vel, acc) x (min, max, std, mean, med, var, range, iqr, skewness, kurtosis)
# This division by bins is guaranteed to work due to the earlier code
X_train = np.reshape(data_train, (users*(videos_train*win_count // bins), feature_vector_length * bins))
X_test = np.reshape(data_test, (users*(videos_test*win_count // bins), feature_vector_length * bins))

y_train = np.array([i for i in range(users) for j in range(videos_train*win_count // bins)])
y_test = np.array([i for i in range(users) for j in range(videos_test*win_count // bins)])

def y_to_mode(y_data):
    individual_vid_samples = np.reshape(y_data, (users * videos_test, y_data.size // (users * videos_test)))

    # Create a sample for each tested user
    mode = scipy.stats.mode(individual_vid_samples, axis=1)
    # Concatenate
    return np.reshape(mode[0], (mode[0].size))

y_test_mode = y_to_mode(y_test);

# Training Random Forest Classifier
randomForest = RandomForestClassifier()
randomForest.fit(X_train,y_train)

y_pred1 = randomForest.predict(X_test)

accuracy1 = accuracy_score(y_test,y_pred1)
accuracy1_mode = accuracy_score(y_test_mode, y_to_mode(y_pred1))
print(f"Accuracy of Random forest on Test Split Data {accuracy1}")
print(f" -> When using mode: {accuracy1_mode}")

# Training KNN
knnClassifier = KNeighborsClassifier(n_neighbors=5)
knnClassifier.fit(X_train, y_train)

y_pred2 = knnClassifier.predict(X_test)

accuracy2 = accuracy_score(y_test,y_pred2)
accuracy2_mode = accuracy_score(y_test_mode, y_to_mode(y_pred2))
print(f"Accuracy of KNN on Test Split Data {accuracy2}")
print(f" -> When using mode: {accuracy2_mode}")

# build the lightgbm model
import lightgbm as lgb
clf = lgb.LGBMClassifier()
clf.fit(X_train, y_train)

y_pred3 = clf.predict(X_test)

accuracy3 = accuracy_score(y_test,y_pred3)
accuracy3_mode = accuracy_score(y_test_mode, y_to_mode(y_pred3))
print(f"Accuracy of LightGBM on Test Split Data {accuracy3}")
print(f" -> When using mode: {accuracy3_mode}")


# It may be worth disabling xgboost for testing different parameters.

if not disable_xgboost:
    # xgboost
    import xgboost as xgb

    xgb_cl = xgb.XGBClassifier()

    xgb_cl.fit(X_train, y_train)
    y_pred4 = xgb_cl.predict(X_test)

    accuracy4 = accuracy_score(y_test,y_pred4)
    accuracy4_mode = accuracy_score(y_test_mode, y_to_mode(y_pred4))
    print(f"Accuracy of xgboost on Test Split Data {accuracy4}")
    print(f" -> When using mode: {accuracy4_mode}")
