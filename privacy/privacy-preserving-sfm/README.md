# Privacy Preserving Structure-From-Motion (SFM)

This repository contains code used for Privacy Preserving Structure-From-Motion
(SFM). At the moment, it includes some demo code that can be used to generate
lines from points as well as Python implementations of both colmap's pose
estimation and the C++ Robust 3Q3 solver (re3q3).

## Repositories Utilized in this Project
This project is based on the code in the Privacy Preserving SFM repository
(<a href="https://github.com/colmap/privacy_preserving_sfm">colmap/privacy\_preserving\_sfm
</a>). This project uses a Python translation of re3q3. The original C++ version can be
found at
<a href="https://github.com/colmap/privacy_preserving_sfm/tree/master/lib/re3q3"
>colmap/privacy\_preserving\_sfm/lib/re3q3/</a>.

## Project Structure
```
Repo Root
+-- demo                    # Files that don't have any specific use, but act as
                            # demos and contain notes.

    +-- PointDemo2.py       # Python version of colmap's conversion of points to
                            #   lines without gravity.
    +-- PointDemo.py        # The first attempt at PointDemo; no practical use,
                            #   but has notes that were used for PointDemo2.
    +-- Point.py            # Used by PointDemo.

+-- ref                     # Copies of C++ code from colmap/privacy_preserving_sfm
                            # with annotations

    +-- MyAbsolutePose.cpp  # A copy of the pose estimation source code from
                            #   colmap, but with annotations in the comments.
    +-- MyLineWriter.cpp    # Copy of the LineWriter code from colmap, but with
                            #   annotations in the comments
    +-- re3q3_annotated.py  # Version of re3q3.py that contains the original
                            #   C++ commented out above the Python translation.
                            #   While this should not be used for running code
                            #   (it differs slightly from the actual re3q3.py),
                            #   it may serve as a useful reference.

+-- src                     # The main source code for privacy preserving sfm

    +-- PoseEstimation.py   # Contains the method estimate() that can calculate
                            #   pose estimation for 6 points and 6 lines.
    +-- re3q3.py            # Python implementation of the C++ Robust 3Q3 solver
                            #   (used by PoseEstimation).
```

## Quick Start

* All Python files require either numpy, scipy, or both.
* PointDemo2 can be run directly from the command line (`$ python PointDemo2.py`)
-- it prints the lines it creates given some points as input (right now the
points are randomly generated).
* PoseEstimation contains the method estimate().
This can be called from other files to perform pose estimation. It expects an
array of 6 Point3D and an array of 6 FeatureLine. Point3D and FeatureLine contain
enough information to represent a point or line respectively, as well as any
additional information that may be needed. At the moment, they do not contain
any additional information and just store the basic representation of either a
3D point (for Point3D) or a 2D line (for FeatureLine).
* Running PoseEstimation from the command line (`$ python PoseEstimation.py`)
will run some test code that tests the estimate() method.

## Notes
* Because PoseEstimation randomly generates values between -1 and 1 to correct
singular matrices, the new matrix it comes up with might still be singular, and
the program may crash when this happens. This is expected behavior. A more robust
method of correcting singular matrices would likely stop this from happening.
* MyAbsolutePose.cpp is an annotated copy of "absolute\_pose.cc" from colmap/privacy\_preserving\_sfm.
Annotations are added with block comments (/\*\*/) that start with the word "me:".
* MyLineWriter.cpp is an annotated copy of the method "LineFeatureWriterThread::Run()"
from "extraction.cc" from colmap/privacy\_preserving\_sfm. Again, annotations are
added with block comments (/\*\*/) that start with the word "me:".
