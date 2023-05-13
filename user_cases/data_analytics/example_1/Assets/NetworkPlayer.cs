using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR;
using Photon.Pun;
//using UnityEngine.XR.Interaction.Toolkit;
public class NetworkPlayer : MonoBehaviour
{
    public Transform head;
    public Transform leftHand;
    public Transform rightHand;
    private PhotonView photonView;
    //private Transform headRig;
    //private Transform leftHandRig;
    //private Transform rightHandRig;

    // Start is called before the first frame update
    void Start()
    {
      photonView= GetComponent<PhotonView>();
    }

    // Update is called once per frame
    void Update()
    {
        if (photonView.IsMine)
           {
            rightHand.gameObject.SetActive(false);
            leftHand.gameObject.SetActive(false);
            head.gameObject.SetActive(false);

            MapPosition(head,XRNode.Head);
            MapPosition(leftHand,XRNode.LeftHand);
            MapPosition(rightHand,XRNode.RightHand);
           }
        
       
        
    }
    void MapPosition(Transform target,XRNode node)
    {
        InputDevices.GetDeviceAtXRNode(node).TryGetFeatureValue(CommonUsages.devicePosition, out Vector3 position);
        InputDevices.GetDeviceAtXRNode(node).TryGetFeatureValue(CommonUsages.deviceRotation, out Quaternion rotation);
        target.position=position;
        target.rotation=rotation;
    }
}
