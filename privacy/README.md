USER IDENTIFICATION IN 360-DEGREE VIDEOS

--------------------------------------------------------------------------------------------------------------------------------------------
A new study introduces a novel approach to user identification, which utilizes gaze data as a biometric modality. The study explores different machine learning techniques, including deep neural networks and ensemble methods, to identify users based on their gaze patterns and evaluates their performance using real-world gaze data.
Repositories Utilized in this Project --------------------------------------------------------------------------

This dataset is from the paper “Gaze Prediction in Dynamic 360◦ Immersive Videos”	provided by Yanyu Xu, Yanbing Dong, Junru Wu, Zhengzhong Sun, Zhiru Shi, Jingyi Yu, and Shenghua Gao	
	In the above data set 45 participants were instructed to freely explore the 208 video clips were divided into six groups, each containing around 35 video clips. 

We have selected 30 videos from each participant and made a final dataset

Code 

Referenced https://scikit-learn.org/stable/  site for model developments

Project Structure-------------------------------------------------------------------

Repo root

+--  Preprocessing.ipynb                        # selecting 20 videos and creating final dataset
+--  UserIdentification.ipynb                 # User identification utilizing different models
Dataset
+-- Gaze_txt_files_2                            # folder contains every user data(raw data)
+-- Final_data.csv                                # extracted dataset

Models Used --------------------------------------------------------------------

KNN
DECISION TREE CLASSIFIER
DEEP NEURAL NETWORK
GAUSSIAN NB
ROCKET CLASSIFIER


Quick Start--------------------------------------------------------------------

Started with some feature extraction methods
Built methods 
Analyzed accuracy by giving gaze and head data separately 

Note

* Basic models work well with this dataset, for the future try to implement more basic models and analyze the accuracy



 						
					 				
			
		




	

		
				
			
		
		

