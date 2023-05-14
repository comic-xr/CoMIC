void OnTrackedImagesChanged(ARTrackedImagesChangedEventArgs* eventArgs)
{
    for (int i = 0; i < eventArgs->updated_count; i++)
    {
        ARTrackedImage* trackedImage = &(eventArgs->updated[i]);
        const char* imageName = trackedImage->referenceImage->name;

        for (int j = 0; j < AreaEffector2DPrefabs_count; j++)
        {
            GameObject* curPrefab = &(AreaEffector2DPrefabs[j]);

            if (strcmp(curPrefab->name, imageName) == 0 && !_instantiatedPrefabs_ContainsKey(imageName))
            {
                GameObject* newPrefab = Instantiate(curPrefab, trackedImage->transform);
                _instantiatedPrefabs_Add(imageName, newPrefab);
            }
        }

        if (_instantiatedPrefabs_ContainsKey(trackedImage->referenceImage->name))
        {
            GameObject* prefab = _instantiatedPrefabs_Get(trackedImage->referenceImage->name);
            bool isActive = trackedImage->trackingState == TrackingState_Tracking;
            SetGameObjectActive(prefab, isActive);
        }
    }
}