 AFRAME.registerComponent('sphereexpand', {
    
   init: function () {

      let homeworldelements = document.querySelectorAll(".homeworld");
      let sky = document.querySelector("#sky");

      let sphereloader = () => {
      sky.setAttribute("src", "#bordeauxtheater");
      homeworldelements.forEach((homeworldelement) => {
      homeworldelement.setAttribute("visible", false)})
      }

      this.el.addEventListener('click', sphereloader);
        
   }});
  
  

