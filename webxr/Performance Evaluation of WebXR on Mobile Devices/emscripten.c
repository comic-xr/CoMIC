#include <emscripten.h>
#include <emscripten/html5.h>

EMSCRIPTEN_KEEPALIVE
void gobackhome() {
  EM_ASM(
    var homeworldelements = document.querySelectorAll(".homeworld");
    var sky = document.querySelector("#sky");
    sky.setAttribute("src", "#starsky");
    homeworldelements.forEach(function(homeworldelement) {
      homeworldelement.setAttribute("visible", true);
    });
  );
}

int main() {
  // Register the click event listener
  emscripten_set_click_callback("#backhome", NULL, 1, gobackhome);
  
  // Run the main loop
  emscripten_set_main_loop(NULL, 0, 1);
  
  return 0;
}