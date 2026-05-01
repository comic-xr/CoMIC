export default function createControlPanel() {
  const container = document.createElement('div');
  container.innerHTML = `
    <table>
      <tr>
        <td>
          <button class='vrbutton' style="width: 100%">Send To VR</button>
        </td>
      </tr>
      <tr>
        <td>
          <select class='representations' style="width: 100%">
            <option value='0'>Points</option>
            <option value='1'>Wireframe</option>
            <option value='2' selected>Surface</option>
          </select>
        </td>
      </tr> 
      <tr>
        <td>
          <input type="file" id="fileInput" style="width: 100%">
        </td>
      </tr>
    </table>
  `;
  return container;
}