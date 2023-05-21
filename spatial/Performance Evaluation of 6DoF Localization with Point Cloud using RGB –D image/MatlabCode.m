
dataFolder      = fullfile(tempdir, 'tum_rgbd_dataset', filesep); 
imageFolder = ['C:\Users\visha\OneDrive\Desktop\gmu\cs 695\Project\code\', 'rgbd_dataset_freiburg3_long_office_household\'];

imgFolderColor = [imageFolder,'rgb/'];
imgFolderDepth = [imageFolder,'depth/'];
imdsColor      = imageDatastore(imgFolderColor);
imdsDepth      = imageDatastore(imgFolderDepth);

% Load time stamp data of color images
timeColor = helperImportTimestampFile([imageFolder, 'rgb.txt']);

% Load time stamp data of depth images
timeDepth = helperImportTimestampFile([imageFolder, 'depth.txt']);

% Align the time stamp
indexPairs = helperAlignTimestamp(timeColor, timeDepth);

% Select the synchronized image data
imdsColor     = subset(imdsColor, indexPairs(:, 1));
imdsDepth     = subset(imdsDepth, indexPairs(:, 2));

% Inspect the first RGB-D image
currFrameIdx  = 1;
currIcolor    = readimage(imdsColor, currFrameIdx);
currIdepth    = readimage(imdsDepth, currFrameIdx);
imshowpair(currIcolor, currIdepth, "montage");

% Set random seed for reproducibility
rng(0);

% Create a cameraIntrinsics object to store the camera intrinsic parameters.
% The intrinsics for the dataset can be found at the following page:
% https://vision.in.tum.de/data/datasets/rgbd-dataset/file_formats
focalLength    = [535.4, 539.2];    % in units of pixels
principalPoint = [320.1, 247.6];    % in units of pixels
imageSize      = size(currIcolor,[1,2]); % in pixels [mrows, ncols]
depthFactor    = 5e3;
intrinsics     = cameraIntrinsics(focalLength,principalPoint,imageSize);

% Detect and extract ORB features from the color image
scaleFactor = 1.2;
numLevels   = 8;
[currFeatures, currPoints] = helperDetectAndExtractFeatures(currIcolor, scaleFactor, numLevels); 

initialPose = rigidtform3d();
[xyzPoints, validIndex] = helperReconstructFromRGBD(currPoints, currIdepth, intrinsics, initialPose, depthFactor);

% Load the bag of features data created offline
bofData         = load("bagOfFeaturesDataSLAM.mat");

% Initialize the place recognition database
loopDatabase    = invertedImageIndex(bofData.bof, SaveFeatureLocations=false);

% Add features of the first key frame to the database
currKeyFrameId = 1;
addImageFeatures(loopDatabase, currFeatures, currKeyFrameId);

% Create an empty imageviewset object to store key frames
vSetKeyFrames = imageviewset;

% Create an empty worldpointset object to store 3-D map points
mapPointSet   = worldpointset;

% Add the first key frame
vSetKeyFrames = addView(vSetKeyFrames, currKeyFrameId, initialPose, Points=currPoints,...
    Features=currFeatures.Features);

% Add 3-D map points
[mapPointSet, rgbdMapPointsIdx] = addWorldPoints(mapPointSet, xyzPoints);

% Add observations of the map points
mapPointSet = addCorrespondences(mapPointSet, currKeyFrameId, rgbdMapPointsIdx, validIndex);

% Update view direction and depth
mapPointSet = updateLimitsAndDirection(mapPointSet, rgbdMapPointsIdx, vSetKeyFrames.Views);

% Update representative view
mapPointSet = updateRepresentativeView(mapPointSet, rgbdMapPointsIdx, vSetKeyFrames.Views);

% Visualize matched features in the first key frame
featurePlot = helperVisualizeMatchedFeaturesRGBD(currIcolor, currIdepth, currPoints(validIndex));

% Visualize initial map points and camera trajectory
xLim = [-4 4];
yLim = [-3 1];
zLim = [-1 6];
mapPlot  = helperVisualizeMotionAndStructure(vSetKeyFrames, mapPointSet, xLim, yLim, zLim);

% Show legend
showLegend(mapPlot);

% ViewId of the last key frame
lastKeyFrameId    = currKeyFrameId;

% Index of the last key frame in the input image sequence
lastKeyFrameIdx   = currFrameIdx; 

% Indices of all the key frames in the input image sequence
addedFramesIdx    = lastKeyFrameIdx;

currFrameIdx      = 2;
isLoopClosed      = false;

% Main loop
isLastFrameKeyFrame = true;
while ~isLoopClosed && currFrameIdx < numel(imdsColor.Files)

    currIcolor = readimage(imdsColor, currFrameIdx);
    currIdepth = readimage(imdsDepth, currFrameIdx);

    [currFeatures, currPoints]    = helperDetectAndExtractFeatures(currIcolor, scaleFactor, numLevels);

    % Track the last key frame
    % trackedMapPointsIdx:  Indices of the map points observed in the current left frame 
    % trackedFeatureIdx:    Indices of the corresponding feature points in the current left frame
    [currPose, trackedMapPointsIdx, trackedFeatureIdx] = helperTrackLastKeyFrame(mapPointSet, ...
        vSetKeyFrames.Views, currFeatures, currPoints, lastKeyFrameId, intrinsics, scaleFactor);
    
    if isempty(currPose) || numel(trackedMapPointsIdx) < 30
        currFrameIdx = currFrameIdx + 1;
        continue
    end
    
    % Track the local map and check if the current frame is a key frame.
    % A frame is a key frame if both of the following conditions are satisfied:
    %
    % 1. At least 20 frames have passed since the last key frame or the 
    %    current frame tracks fewer than 100 map points. 
    % 2. The map points tracked by the current frame are fewer than 90% of 
    %    points tracked by the reference key frame.
    %
    % localKeyFrameIds:   ViewId of the connected key frames of the current frame
    numSkipFrames     = 20;
    numPointsKeyFrame = 100;
    [localKeyFrameIds, currPose, trackedMapPointsIdx, trackedFeatureIdx, isKeyFrame] = ...
        helperTrackLocalMap(mapPointSet, vSetKeyFrames, trackedMapPointsIdx, ...
        trackedFeatureIdx, currPose, currFeatures, currPoints, intrinsics, scaleFactor, numLevels, ...
        isLastFrameKeyFrame, lastKeyFrameIdx, currFrameIdx, numSkipFrames, numPointsKeyFrame);

    % Visualize matched features
    updatePlot(featurePlot, currIcolor, currIdepth, currPoints(trackedFeatureIdx));
    
    if ~isKeyFrame
        currFrameIdx = currFrameIdx + 1;
        isLastFrameKeyFrame = false;
        continue
    else
        % Match feature points between the stereo images and get the 3-D world positions
        [xyzPoints, validIndex] = helperReconstructFromRGBD(currPoints, currIdepth, ...
            intrinsics, currPose, depthFactor);

        [untrackedFeatureIdx, ia] = setdiff(validIndex, trackedFeatureIdx);
        xyzPoints = xyzPoints(ia, :);
        isLastFrameKeyFrame = true;
    end

    % Update current key frame ID
    currKeyFrameId  = currKeyFrameId + 1;

    % Add the new key frame    
    [mapPointSet, vSetKeyFrames] = helperAddNewKeyFrame(mapPointSet, vSetKeyFrames, ...
        currPose, currFeatures, currPoints, trackedMapPointsIdx, trackedFeatureIdx, localKeyFrameIds);
        
    % Remove outlier map points that are observed in fewer than 3 key frames
    if currKeyFrameId == 2
        triangulatedMapPointsIdx = [];
    end
    
    [mapPointSet, trackedMapPointsIdx] = ...
        helperCullRecentMapPoints(mapPointSet, trackedMapPointsIdx, triangulatedMapPointsIdx, ...
        rgbdMapPointsIdx);
    
    % Add new map points computed from disparity 
    [mapPointSet, rgbdMapPointsIdx] = addWorldPoints(mapPointSet, xyzPoints);
    mapPointSet = addCorrespondences(mapPointSet, currKeyFrameId, rgbdMapPointsIdx, ...
        untrackedFeatureIdx);
    
    % Create new map points by triangulation
    minNumMatches = 10;
    minParallax   = 0.35;
    [mapPointSet, vSetKeyFrames, triangulatedMapPointsIdx, rgbdMapPointsIdx] = helperCreateNewMapPointsStereo( ...
        mapPointSet, vSetKeyFrames, currKeyFrameId, intrinsics, scaleFactor, minNumMatches, minParallax, ...
        untrackedFeatureIdx, rgbdMapPointsIdx);

    % Update view direction and depth
    mapPointSet = updateLimitsAndDirection(mapPointSet, [triangulatedMapPointsIdx; rgbdMapPointsIdx], ...
        vSetKeyFrames.Views);

    % Update representative view
    mapPointSet = updateRepresentativeView(mapPointSet, [triangulatedMapPointsIdx; rgbdMapPointsIdx], ...
        vSetKeyFrames.Views);

    % Local bundle adjustment
    [mapPointSet, vSetKeyFrames, triangulatedMapPointsIdx, rgbdMapPointsIdx] = ...
        helperLocalBundleAdjustmentStereo(mapPointSet, vSetKeyFrames, ...
        currKeyFrameId, intrinsics, triangulatedMapPointsIdx, rgbdMapPointsIdx);

    % Visualize 3-D world points and camera trajectory
    updatePlot(mapPlot, vSetKeyFrames, mapPointSet);
    % Check loop closure after some key frames have been created    
    if currKeyFrameId > 20
        
        % Minimum number of feature matches of loop edges
        loopEdgeNumMatches = 120;
        
        % Detect possible loop closure key frame candidates
        [isDetected, validLoopCandidates] = helperCheckLoopClosure(vSetKeyFrames, currKeyFrameId, ...
            loopDatabase, currIcolor, loopEdgeNumMatches);
        
        if isDetected 
            % Add loop closure connections
            maxDistance = 0.1;
            [isLoopClosed, mapPointSet, vSetKeyFrames] = helperAddLoopConnectionsStereo(...
                mapPointSet, vSetKeyFrames, validLoopCandidates, currKeyFrameId, ...
                currFeatures, currPoints, loopEdgeNumMatches, maxDistance);
        end
    end
    
    % If no loop closure is detected, add current features into the database
    if ~isLoopClosed
        addImageFeatures(loopDatabase,  currFeatures, currKeyFrameId);
    end
    
    % Update IDs and indices
    lastKeyFrameId  = currKeyFrameId;
    lastKeyFrameIdx = currFrameIdx;
    addedFramesIdx  = [addedFramesIdx; currFrameIdx]; %#ok<AGROW>
    currFrameIdx    = currFrameIdx + 1;
end % End of main loop

% Optimize the poses
minNumMatches      = 50;
vSetKeyFramesOptim = optimizePoses(vSetKeyFrames, minNumMatches, Tolerance=1e-16);

% Update map points after optimizing the poses
mapPointSet = helperUpdateGlobalMap(mapPointSet, vSetKeyFrames, vSetKeyFramesOptim);

updatePlot(mapPlot, vSetKeyFrames, mapPointSet);

% Plot the optimized camera trajectory
optimizedPoses  = poses(vSetKeyFramesOptim);
plotOptimizedTrajectory(mapPlot, optimizedPoses)

% Update legend
showLegend(mapPlot);

% Load ground truth 
gTruthData = load("orbslamGroundTruth.mat");
gTruth     = gTruthData.gTruth;

% Plot the actual camera trajectory 
plotActualTrajectory(mapPlot, gTruth(indexPairs(addedFramesIdx, 1)), optimizedPoses);

% Show legend
showLegend(mapPlot);

% Evaluate tracking accuracy
helperEstimateTrajectoryError(gTruth(indexPairs(addedFramesIdx, 1)), optimizedPoses);

% Create an array of pointCloud objects to store the world points constructed
% from the key frames
ptClouds =  repmat(pointCloud(zeros(1, 3)), numel(addedFramesIdx), 1);

% Ignore image points at the boundary 
offset = 40;
[X, Y] = meshgrid(offset:2:imageSize(2)-offset, offset:2:imageSize(1)-offset);

for i = 1: numel(addedFramesIdx)
    Icolor = readimage(imdsColor, addedFramesIdx(i));
    Idepth = readimage(imdsDepth, addedFramesIdx(i));

    [xyzPoints, validIndex] = helperReconstructFromRGBD([X(:), Y(:)], ...
        Idepth, intrinsics, optimizedPoses.AbsolutePose(i), depthFactor);

    colors = zeros(numel(X), 1, 'like', Icolor);
    for j = 1:numel(X)
        colors(j, 1:3) = Icolor(Y(j), X(j), :);
    end
    ptClouds(i) = pointCloud(xyzPoints, Color=colors(validIndex, :));
end

% Concatenate the point clouds
pointCloudsAll = pccat(ptClouds);
pcwrite(pointCloudsAll,"office5.ply")
figure
pcshow(pointCloudsAll,VerticalAxis="y", VerticalAxisDir="down");
xlabel('X')
ylabel('Y')
zlabel('Z')

function timestamp = helperImportTimestampFile(filename)

% Input handling
dataLines = [4, Inf];

%% Set up the Import Options and import the data
opts = delimitedTextImportOptions("NumVariables", 2);

% Specify range and delimiter
opts.DataLines = dataLines;
opts.Delimiter = " ";

% Specify column names and types
opts.VariableNames = ["VarName1", "Var2"];
opts.SelectedVariableNames = "VarName1";
opts.VariableTypes = ["double", "string"];

% Specify file level properties
opts.ExtraColumnsRule = "ignore";
opts.EmptyLineRule = "read";
opts.ConsecutiveDelimitersRule = "join";
opts.LeadingDelimitersRule = "ignore";

% Specify variable properties
opts = setvaropts(opts, "Var2", "WhitespaceRule", "preserve");
opts = setvaropts(opts, "Var2", "EmptyFieldRule", "auto");

% Import the data
data = readtable(filename, opts);

% Convert to output type
timestamp = table2array(data);
end

function indexPairs = helperAlignTimestamp(timeColor, timeDepth)
idxDepth = 1;
indexPairs = zeros(numel(timeColor), 2);
for i = 1:numel(timeColor)
    for j = idxDepth : numel(timeDepth)
        if abs(timeColor(i) - timeDepth(j)) < 1e-4
            idxDepth = j;
            indexPairs(i, :) = [i, j];
            break
        elseif timeDepth(j) - timeColor(i) > 1e-3
            break
        end
    end
end
indexPairs = indexPairs(indexPairs(:,1)>0, :);
end

function [features, validPoints] = helperDetectAndExtractFeatures(Irgb, scaleFactor, numLevels)
 
numPoints = 1000;

% Detect ORB features
Igray  = rgb2gray(Irgb);

points = detectORBFeatures(Igray, ScaleFactor=scaleFactor, NumLevels=numLevels);

% Select a subset of features, uniformly distributed throughout the image
points = selectUniform(points, numPoints, size(Igray, 1:2));

% Extract features
[features, validPoints] = extractFeatures(Igray, points);
end

function [xyzPoints, validIndex] = helperReconstructFromRGBD(points, ...
    depthMap, intrinsics, currPose, depthFactor)

ptcloud = pcfromdepth(depthMap,depthFactor,intrinsics,ImagePoints=points, DepthRange=[0.1, 5]);

isPointValid = ~isnan(ptcloud.Location(:, 1));
xyzPoints    = ptcloud.Location(isPointValid, :);
xyzPoints    = transformPointsForward(currPose, xyzPoints);
validIndex   = find(isPointValid);
end

function [mapPointSet, mapPointsIdx] = ...
    helperCullRecentMapPoints(mapPointSet, mapPointsIdx, newPointIdx, rgbdMapPointsIndices)
outlierIdx = setdiff([newPointIdx; rgbdMapPointsIndices], mapPointsIdx);
if ~isempty(outlierIdx)
    mapPointSet   = removeWorldPoints(mapPointSet, outlierIdx);
    mapPointsIdx  = mapPointsIdx - arrayfun(@(x) nnz(x>outlierIdx), mapPointsIdx);
end
end

function rmse = helperEstimateTrajectoryError(gTruth, cameraPoses)
locations       = vertcat(cameraPoses.AbsolutePose.Translation);
gLocations      = vertcat(gTruth.Translation);
scale           = median(vecnorm(gLocations, 2, 2))/ median(vecnorm(locations, 2, 2));
scaledLocations = locations * scale;

rmse = sqrt(mean( sum((scaledLocations - gLocations).^2, 2) ));
disp(['Absolute RMSE for key frame trajectory (m): ', num2str(rmse)]);
end

function mapPointSet = helperUpdateGlobalMap(mapPointSet, vSetKeyFrames, vSetKeyFramesOptim)

posesOld     = vSetKeyFrames.Views.AbsolutePose;
posesNew     = vSetKeyFramesOptim.Views.AbsolutePose;
positionsOld = mapPointSet.WorldPoints;
positionsNew = positionsOld;
indices = 1:mapPointSet.Count;

% Update world location of each map point based on the new absolute pose of 
% the corresponding major view
for i = 1: mapPointSet.Count
    majorViewIds = mapPointSet.RepresentativeViewId(i);
    tform = rigidtform3d(posesNew(majorViewIds).A/posesOld(majorViewIds).A);
    positionsNew(i, :) = transformPointsForward(tform, positionsOld(i, :));
end
mapPointSet = updateWorldPoints(mapPointSet, indices, positionsNew);
end


