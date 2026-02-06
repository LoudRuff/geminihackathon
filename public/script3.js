const buttons = document.querySelectorAll('button');
const startNumber = 1000000;

buttons.forEach((btn, index) => {
  btn.addEventListener('click', () => {
    alert("Doctor ID\n" + (startNumber + index));
  });
});
