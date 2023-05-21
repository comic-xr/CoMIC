function mapReconstruct()
{   
    document.getElementById("demo").innerHTML="TEST CHANGING";
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://192.168.1.103:5444/capture-photo/construct')
    //xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', 'application/json');
    //xhr.send();

    //alert('Incomplete')
    var data = {
        "token": "192b47014ee982495df0a08674ac49a11eca4cb4427e3115a0254b89d07587cc",
        "bank": 0,
        "name": "pyFirstMap",
        "feature_dim": 6,
        "window_size": 0
    };

    var json_data = JSON.stringify(data);
    xhr.send(json_data);
}

const xhr1 = new XMLHttpRequest();
function localize(element)
{
  var file = element.files[0];
  var reader = new FileReader();

  //const xhr = new XMLHttpRequest();
  xhr1.open('POST', 'http://192.168.1.103:5444/capture-photo/querylocal')

  xhr1.setRequestHeader('Content-Type', 'application/json');

  reader.onload = function() {
    var data = {
      "token": "192b47014ee982495df0a08674ac49a11eca4cb4427e3115a0254b89d07587cc",
      "bank": 0,
      "b64": reader.result.replace("data:", "").replace(/^.+,/, ""),
      "image_name": file.name
    }

    var json_data = JSON.stringify(data);
    console.log(data)
    xhr1.send(json_data);
  }
  reader.readAsDataURL(file);
}

function show()
{
  document.getElementById('temp').innerHTML = xhr1.responseText;
}

function reconsUpload()
{
  //gets uploaded files from the html
  var files = document.getElementById("file").files;

  //loop to convert each image into a compatible json object
  //then submits the JSON
  Array.from(files).forEach(function(file) {
    //reader declaration within loop
    //need a separate file reader to avoid problems with reader being busy
    var reader = new FileReader();
    reader.onload = function() {
      var data = {
        "token": "192b47014ee982495df0a08674ac49a11eca4cb4427e3115a0254b89d07587cc",
        "bank": 0,
        "run": 0,
        "index": 0,
        "anchor": false,
        "px": 0.0,
        "py": 0.0,
        "pz": 0.0,
        "r00": 1.0,
        "r01": 0.0,
        "r02": 0.0,
        "r10": 0.0,
        "r11": 1.0,
        "r12": 0.0,
        "r20": 0.0,
        "r21": 0.0,
        "r22": 1.0,
        "fx": 2457.5,
        "fy": 2457.5,
        "ox": 1152,
        "oy": 1536,
        "b64": reader.result.replace("data:", "").replace(/^.+,/, ""),
        "image_name": file.name
      }

      let json_data = JSON.stringify(data);
      console.log(data)

      //creating xmlhttp request, inside loop to avoid problem with open/closed
      //also because each image needs a separate request
      var xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://192.168.1.103:5444/capture-photo/captureb64', true)
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.send(json_data)
    }
    reader.readAsDataURL(file);
  })
}