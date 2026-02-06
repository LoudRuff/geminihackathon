let tween = gsap.from("#h1", {
     y: 100,
     opacity: 0,
     duration: 1,
     repeat: 0
});
let tween1 = gsap.from("li", {
     x: -100,
     opacity: 0,
     duration: 1.2,
     delay: 2,
     stagger: 0.2,
     repeat: 0
});
let tween2 = gsap.from(".btnpart", {
     x: 100,
     opacity: 0,
     duration: 1.9,
     delay: 1.2,
     repeat: 0
})
let btn = document.querySelector("#btn1");

let form = document.querySelector("#appointment-form");

btn.addEventListener("click", () => {
     form.classList.toggle("show")
})

