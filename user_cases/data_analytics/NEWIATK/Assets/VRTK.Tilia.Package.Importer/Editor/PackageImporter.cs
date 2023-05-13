namespace Tilia.Utilities
{
    using SimpleJSON;
    using System;
    using System.Collections;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using Unity.EditorCoroutines.Editor;
    using UnityEditor;
    using UnityEditor.PackageManager;
    using UnityEditor.PackageManager.Requests;
    using UnityEngine;
    using UnityEngine.Networking;

    [InitializeOnLoad]
    public class PackageImporter : EditorWindow
    {
        private static EditorWindow promptWindow;
        private const string WindowPath = "Window/Tilia/";
        private const string WindowName = "Package Importer";
        private const string DataUri = "https://www.vrtk.io/tilia.json";
        private const string titleLabel = " Available Tilia Packages To Import";
        private const string addingPackagesMessage = "Adding packages, please wait...";
        private const string scopedRegisryMissingText = "The required scoped registry has not been found in your project manifest.json.\n\nClick the button below to attempt to automatically add the required scoped registry to your project manifest.json file.";
        private const string addScopedRegistryButtonText = "Add Scoped Registry";
        private const string loadingText = "Loading";
        private const string filterLabel = "Filter";
        private const int filterLabelWidth = 40;
        private const string addButtonText = "Add";
        private const string viewButtonText = "View";
        private const string viewButtonTooltip = "View on GitHub";
        private const string refreshPackageListButton = "Refresh Package List";
        private static bool windowAlreadyOpen;
        private static List<string> installedPackages = new List<string>();
        private static AddRequest addRequest;
        private static ListRequest installedPackagesRequest;

        private bool registryFound;
        private bool registryChecked;
        private string manifestFile;
        private JSONNode rootManifest;
        private EditorCoroutine getWebDataRoutine;
        private string availableScopedRegistry;
        private List<string> availablePackages = new List<string>();
        private Dictionary<string, string> packageDescriptions = new Dictionary<string, string>();
        private Dictionary<string, string> packageUrls = new Dictionary<string, string>();
        private Vector2 scrollPosition;
        private string searchString = "";

#if UNITY_2021_2_OR_NEWER
        private const string addSelectedPackagesButton = "Add Selected Packages";
        private static AddAndRemoveRequest addAndRemoveRequest;
        private Dictionary<string, bool> checkboxes = new Dictionary<string, bool>();
        private List<string> packagesToAdd = new List<string>();
#endif

        public void OnGUI()
        {
            if (!windowAlreadyOpen)
            {
                DownloadPackageList();
                windowAlreadyOpen = true;
            }

            DrawHorizontalLine(Color.black);
            GUILayout.Space(1);
            GUILayout.Label(titleLabel, new GUIStyle { fontSize = 15, fontStyle = FontStyle.Bold });
            DrawHorizontalLine(Color.black);

            if (!registryFound)
            {
                if (registryChecked)
                {
                    EditorGUILayout.HelpBox(scopedRegisryMissingText, MessageType.Warning);
                    GUILayout.Space(4);
                    if (GUILayout.Button(addScopedRegistryButtonText))
                    {
                        AddRegistry();
                    }
                }
                else
                {
                    GUILayout.Label(loadingText);
                }
            }
            else
            {
                using (new EditorGUILayout.HorizontalScope())
                {
                    EditorGUILayout.LabelField(filterLabel, GUILayout.Width(filterLabelWidth));
                    searchString = EditorGUILayout.TextField(searchString);
                }

                DrawHorizontalLine();

                using (GUILayout.ScrollViewScope scrollViewScope = new GUILayout.ScrollViewScope(scrollPosition))
                {
                    scrollPosition = scrollViewScope.scrollPosition;

                    if (addRequest != null)
                    {
                        GUILayout.Label(addingPackagesMessage);
                    }
#if UNITY_2021_2_OR_NEWER
                    else if (addAndRemoveRequest != null)
                    {
                        GUILayout.Label(addingPackagesMessage);
                    }
#endif
                    else
                    {
                        foreach (string availablePackage in availablePackages.Except(installedPackages).ToList())
                        {
                            if (!string.IsNullOrEmpty(searchString.Trim()) && !availablePackage.Contains(searchString))
                            {
                                continue;
                            }

                            using (new EditorGUILayout.HorizontalScope())
                            {
                                packageDescriptions.TryGetValue(availablePackage, out string packageDescription);
                                packageUrls.TryGetValue(availablePackage, out string packageUrl);

#if UNITY_2021_2_OR_NEWER
                                if (checkboxes.ContainsKey(availablePackage))
                                {
                                    checkboxes[availablePackage] = GUILayout.Toggle(checkboxes[availablePackage], "");
                                }
#endif

                                GUILayout.Label(new GUIContent(availablePackage, packageDescription));
                                GUILayout.FlexibleSpace();

                                if (GUILayout.Button(addButtonText))
                                {
                                    AddPackage(availablePackage);
                                }

                                if (GUILayout.Button(new GUIContent(viewButtonText, viewButtonTooltip)))
                                {
                                    Application.OpenURL(packageUrl);
                                }
                                GUILayout.Label(" ", new GUIStyle { fontSize = 10 });
                            }
                            DrawHorizontalLine();
                        }
                    }
                }

#if UNITY_2021_2_OR_NEWER
                if (HasSelectedPackages() && addRequest == null && addAndRemoveRequest == null)
                {
                    DrawHorizontalLine(Color.black);

                    using (new EditorGUILayout.HorizontalScope())
                    {
                        if (GUILayout.Button(addSelectedPackagesButton))
                        {
                            AddSelectedPackages();
                        }
                    }
                }
#endif

                DrawHorizontalLine(Color.black);

                using (new EditorGUILayout.HorizontalScope())
                {
                    if (addRequest == null)
                    {
#if UNITY_2021_2_OR_NEWER
                        if (addAndRemoveRequest == null)
                        {
#endif
                        if (GUILayout.Button(refreshPackageListButton))
                        {
                            DownloadPackageList();
                        }
#if UNITY_2021_2_OR_NEWER
                        }
#endif
                    }
                }
            }

            GUILayout.Space(8);
        }

        private void OnDestroy()
        {
            if (getWebDataRoutine != null)
            {
                EditorCoroutineUtility.StopCoroutine(getWebDataRoutine);
            }

            if (addRequest != null)
            {
                EditorApplication.update -= HandlePackageAddRequest;
                addRequest = null;
            }

#if UNITY_2021_2_OR_NEWER
            if(addAndRemoveRequest != null)
            {
                EditorApplication.update -= HandlePackageAddAndRemoveRequest;
                addAndRemoveRequest = null;
            }
#endif
        }

        private void AddPackage(string packageName)
        {
            addRequest = Client.Add(packageName);
            EditorApplication.update += HandlePackageAddRequest;
        }

#if UNITY_2021_2_OR_NEWER
        private bool HasSelectedPackages()
        {
            bool result = false;
            foreach (KeyValuePair<string, bool> entry in checkboxes)
            {
                if (entry.Value == true)
                {
                    return true;
                }
            }

            return result;
        }

        private void AddSelectedPackages()
        {
            packagesToAdd.Clear();
            foreach (KeyValuePair<string, bool> entry in checkboxes)
            {
                if (entry.Value == true)
                {
                    packagesToAdd.Add(entry.Key);
                }
            }

            if (packagesToAdd.Count > 0)
            {
                addAndRemoveRequest = Client.AddAndRemove(packagesToAdd.ToArray());
                EditorApplication.update += HandlePackageAddAndRemoveRequest;
            }
        }

        private static void HandlePackageAddAndRemoveRequest()
        {
            if (addAndRemoveRequest != null && addAndRemoveRequest.IsCompleted)
            {
                if (addAndRemoveRequest.Status == StatusCode.Success)
                {
                    GetInstalledPackages();
                }
                else
                {
                    Debug.LogError("Failure to add package: " + addAndRemoveRequest.Error.message);
                }

                EditorApplication.update -= HandlePackageAddAndRemoveRequest;
                addAndRemoveRequest = null;
            }
        }
#endif

        private void DownloadPackageList()
        {
            GetInstalledPackages();
            GetRawData();
        }

        private void GetRawData()
        {
            if (getWebDataRoutine != null)
            {
                return;
            }

            getWebDataRoutine = EditorCoroutineUtility.StartCoroutine(GetWebRequest(DataUri), this);
        }

        private IEnumerator GetWebRequest(string uri)
        {
            using (UnityWebRequest webRequest = UnityWebRequest.Get(uri))
            {
                // Request and wait for the desired page.
                yield return webRequest.SendWebRequest();

#if UNITY_2020_1_OR_NEWER
                switch (webRequest.result)
                {
                    case UnityWebRequest.Result.ConnectionError:
                    case UnityWebRequest.Result.DataProcessingError:
                        Debug.LogError("Error: " + webRequest.error);
                        break;
                    case UnityWebRequest.Result.ProtocolError:
                        Debug.LogError("HTTP Error: " + webRequest.error);
                        break;
                    case UnityWebRequest.Result.Success:
                        ParseRawData(webRequest.downloadHandler.text);
                        break;
                }
#else
                if (webRequest.isNetworkError)
                {
                    Debug.LogError("Error: " + webRequest.error);
                }
                else if (webRequest.isHttpError)
                {
                    Debug.LogError("HTTP Error: " + webRequest.error);
                }
                else
                {
                    ParseRawData(webRequest.downloadHandler.text);
                }
#endif
            }

            getWebDataRoutine = null;
        }

        private void ParseRawData(string data)
        {
            if (string.IsNullOrEmpty(data))
            {
                return;
            }

            JSONNode jsonData = JSONNode.Parse(data);

            availablePackages.Clear();
            packageDescriptions.Clear();
            packageUrls.Clear();
#if UNITY_2021_2_OR_NEWER
            checkboxes.Clear();
#endif

            if (!string.IsNullOrEmpty(jsonData["scopedRegistry"]))
            {
                availableScopedRegistry = "{ " + jsonData["scopedRegistry"] + " }";
            }

            foreach (JSONNode package in jsonData["packages"])
            {
                availablePackages.Add(package["name"]);
                packageDescriptions.Add(package["name"], package["description"] + ".\n\nLatest version: " + package["version"]);
                packageUrls.Add(package["name"], package["url"]);
#if UNITY_2021_2_OR_NEWER
                checkboxes.Add(package["name"], false);
#endif
            }

            DoesRegistryExist();
        }

        private void DoesRegistryExist()
        {
            manifestFile = Path.Combine(Application.dataPath, "..", "Packages", "manifest.json");
            string manifest = File.ReadAllText(manifestFile);
            rootManifest = JSONNode.Parse(manifest);

            registryFound = false;

            foreach (JSONNode registry in rootManifest["scopedRegistries"])
            {
                if (Array.IndexOf(registry["scopes"], "io.extendreality") > -1)
                {
                    registryFound = true;
                }
            }

            registryChecked = true;
        }

        private void AddRegistry()
        {
            if (!registryFound && !string.IsNullOrEmpty(availableScopedRegistry))
            {
                JSONNode newNode = JSONNode.Parse(availableScopedRegistry);
                rootManifest["scopedRegistries"].Add(newNode);
                File.WriteAllText(manifestFile, rootManifest.ToString());
                DownloadPackageList();
            }
        }

        private static void GetInstalledPackages()
        {
#if UNITY_2019_3_OR_NEWER
            installedPackagesRequest = Client.List(false, true);
#else
            installedPackagesRequest = Client.List(false);
#endif
            EditorApplication.update += HandleInstalledPackagesRequest;
        }

        private static void HandleInstalledPackagesRequest()
        {
            if (installedPackagesRequest.IsCompleted)
            {
                if (installedPackagesRequest.Status == StatusCode.Success)
                {
                    installedPackages.Clear();
                    foreach (var packageInfo in installedPackagesRequest.Result)
                    {
                        installedPackages.Add(packageInfo.name);
                    }
                }
                else
                {
                    Debug.LogError("Failure to receive installed packages: " + installedPackagesRequest.Error.message);
                }

                EditorApplication.update -= HandleInstalledPackagesRequest;
            }
        }

        private static void HandlePackageAddRequest()
        {
            if (addRequest != null && addRequest.IsCompleted)
            {
                if (addRequest.Status == StatusCode.Success)
                {
                    GetInstalledPackages();
                }
                else
                {
                    Debug.LogError("Failure to add package: " + addRequest.Error.message);
                }

                EditorApplication.update -= HandleInstalledPackagesRequest;
                addRequest = null;
            }
        }

        private static void DrawHorizontalLine(Color color, float height, Vector2 margin)
        {
            GUILayout.Space(margin.x);
            EditorGUI.DrawRect(EditorGUILayout.GetControlRect(false, height), color);
            GUILayout.Space(margin.y);
        }

        private static void DrawHorizontalLine(Color color)
        {
            DrawHorizontalLine(color, 1f, Vector2.one * 5f);
        }

        private static void DrawHorizontalLine()
        {
            DrawHorizontalLine(new Color(0f, 0f, 0f, 0.3f));
        }

        [MenuItem(WindowPath + WindowName)]
        private static void ShowWindow()
        {
            windowAlreadyOpen = false;
            promptWindow = GetWindow(typeof(PackageImporter));
            promptWindow.titleContent = new GUIContent(WindowName);
        }
    }
}