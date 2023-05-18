# Privacy Preserving Structure-From-Motion (SFM)

This repository contains code used for Privacy Preserving Structure-From-Motion
(SFM). At the moment, it includes some demo code that can be used to generate
lines from points as well as Python implementations of both colmap's pose
estimation and the C++ Robust 3Q3 solver (re3q3).

## Repositories Utilized in this Project
This project is based on the code in the Privacy Preserving SFM repository
(<a href="https://github.com/colmap/privacy_preserving_sfm">colmap/privacy\_preserving\_sfm
</a>) with credit going to Marcel Geppert, Viktor Larsson, Pablo Speciale,
Johannes L. Schönberger, and Marc Pollefeys with their publication
"Privacy Preserving Structure-from-Motion" from the *European Conference on Computer Vision (ECCV)*
in 2020. Schönberger and Jan-Michael Frahm also contributed
with their work, "Structure-from-Motion Revisited" from the
*Conference on Computer Vision and Pattern Recognition (CVPR)* from 2016. It is
a variation of colmap.

## Project Structure
The following is an example of how to write a project structure
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
+-- src                     # The main source code for privacy preserving sfm

    +-- PoseEstimation.py   # Contains the method estimate() that can calculate pose
                            #   estimation given 6 points and 6 lines.
    +-- re3q3.py            # Python implementation of the C++ Robust 3Q3 solver
                            #   (used by PoseEstimation).
```

## Quick Start

* All python files require either numpy, scipy, or both.
* PointDemo2 can be run directly from the command line (`$ python PointDemo2.py`)
-- it prints the lines it creates given some points as input (right now the
points are randomly generated).
* PoseEstimation does nothing by itself, but contains the method estimate().
This can be called from other files to perform pose estimation. It expects an
array of 6 Point3D and an array of 6 Line2D. Point3D and Line2D contain enough
information to represent a point or line respectively, as well as any
additional information that may be needed. At the moment, they do not contain
any additional information and just store the basic representation of either a
3D point (for Point3D) or a 2D line (for Line2D).

## Notes
* At the moment, re3q3 is incomplete, so the value that PoseEstimation returns is
not meaningful.
* MyAbsolutePose.cpp is an annotated copy of "absolute\_pose.cc" from colmap/privacy\_preserving\_sfm.
Annotations are added with block comments (/\*\*/) that start with the word "me:".
* MyLineWriter.cpp is an annotated copy of the method "LineFeatureWriterThread::Run()"
from "extraction.cc" from colmap/privacy\_preserving\_sfm. Again, annotations are
added with block comments (/\*\*/) that start with the word "me:".
