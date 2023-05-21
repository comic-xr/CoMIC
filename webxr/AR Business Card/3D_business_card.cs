	using System;
	using System.Collections.Generic;
	using UnityEngine;
	using UnityEngine.XR.ARFoundation;
	using UnityEngine.XR.ARSubsystems;

	[RequireComponent(typeof(ARTrackedImageManager))]
	public class PlaceTrackedImages : MonoBehaviour
	{
		// Reference to AR tracked image manager component
		private ARTrackedImageManager _trackedImagesManager;

		// List of prefabs to instantiate - these should be named the same
		// as their corresponding 2D images in the reference image library 
		public GameObject[] ArPrefabs;


		private readonly Dictionary<string, GameObject> _instantiatedPrefabs = new Dictionary<string, GameObject>();
		foreach(var trackedImage in eventArgs.added){
		// Get the name of the reference image
		var imageName = trackedImage.referenceImage.name;
		  foreach (var curPrefab in ArPrefabs) {
		// Check whether this prefab matches the tracked image name, and that
		// the prefab hasn't already been created
		if (string.Compare(curPrefab.name, imageName, StringComparison.OrdinalIgnoreCase) == 0
		  && !_instantiatedPrefabs.ContainsKey(imageName)){
		//Instantiate the prefab, parenting it to the ARTrackedImage
		  var newPrefab = Instantiate(curPrefab, trackedImage.transform);
		void Awake()
		{
			_trackedImagesManager = GetComponent<ARTrackedImageManager>();
		}
		private void OnEnable()
		{
			_trackedImagesManager.trackedImagesChanged += OnTrackedImagesChanged;
		}
		private void OnDisable()
		{
			_trackedImagesManager.trackedImagesChanged -= OnTrackedImagesChanged;
		}
		private void OnTrackedImagesChanged(ARTrackedImagesChangedEventArgs eventArgs)
		{
			foreach (var trackedImage in eventArgs.updated)
			{
				var imageName = trackedImage.referenceImage.name;
				foreach (var curPrefab in AreaEffector2DPrefabs)
				 {
				 if (string.Compare(curPrefab.name, imageName, StringComparison.OrdinalIgnoreCase) == 0
				  && !_instantiatedPrefabs.ContainsKey(imageName))
				  {
				  var newPrefab = Instantiate(curPrefab, trackedImage.transform);
				   _instantiatedPrefabs[imageName] = newPrefab;
				 }
				 }
				 }
				_instantiatedPrefabs[trackedImage.referenceImage.name].SetActive(trackedImage.trackingState == TrackingState.Tracking);
			}


			foreach (var trackedImage in eventArgs.removed)
			{
				// Destroy its prefab
				Destroy(_instantiatedPrefabs[trackedImage.referenceImage.name]);
				// Also remove the instance from our array
				_instantiatedPrefabs.Remove(trackedImage.referenceImage.name);
				// Or, simply set the prefab instance to inactive
				//_instantiatedPrefabs[trackedImage.referenceImage.name].SetActive(false);
			}
		}
	}


