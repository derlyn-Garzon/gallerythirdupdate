document.addEventListener('DOMContentLoaded', () => {
  const cube = document.getElementById('cube');
  const rollBtn = document.getElementById('rollBtn');
  const bannerText = document.getElementById('bannerText');
  const messageBanner = document.getElementById('messageBanner');
  const cubeFaces = document.querySelectorAll('.cube-face');

  // Quotes matching the 6 cube faces (0: Front, 1: Back, 2: Right, 3: Left, 4: Top, 5: Bottom)
  const faceData = [
    { text: "Todo fluye", name: "Cara 1" },
    { text: "Confía en el proceso", name: "Cara 2" },
    { text: "Crea tu realidad", name: "Cara 3" },
    { text: "Brilla con luz propia", name: "Cara 4" },
    { text: "Cada día es una oportunidad", name: "Cara 5" },
    { text: "Sigue a tu corazón", name: "Cara 6" }
  ];

  // Target rotation angles in multiples of 90 degrees to show each face
  const faceAngles = [
    { x: 0, y: 0 },       // Face 1: Front
    { x: 0, y: 180 },     // Face 2: Back
    { x: 0, y: -90 },     // Face 3: Right
    { x: 0, y: 90 },      // Face 4: Left
    { x: -90, y: 0 },     // Face 5: Top
    { x: 90, y: 0 }       // Face 6: Bottom
  ];

  let currentX = 0;
  let currentY = 0;
  let isRolling = false;

  function rollCube() {
    if (isRolling) return;

    isRolling = true;
    rollBtn.disabled = true;
    rollBtn.style.cursor = 'not-allowed';

    // Pick a random face index (0 to 5)
    const targetIndex = Math.floor(Math.random() * faceData.length);
    const targetAngle = faceAngles[targetIndex];

    // Calculate extra full rotations (2 to 4 full 360 degree spins) for dramatic roll
    const extraSpinsX = (2 + Math.floor(Math.random() * 3)) * 360;
    const extraSpinsY = (2 + Math.floor(Math.random() * 3)) * 360;

    // Calculate new total cumulative rotation angles so transition is continuous and smooth
    const currentModuloX = ((currentX % 360) + 360) % 360;
    const currentModuloY = ((currentY % 360) + 360) % 360;

    const targetModuloX = ((targetAngle.x % 360) + 360) % 360;
    const targetModuloY = ((targetAngle.y % 360) + 360) % 360;

    let deltaX = targetModuloX - currentModuloX;
    let deltaY = targetModuloY - currentModuloY;

    currentX += extraSpinsX + deltaX;
    currentY += extraSpinsY + deltaY;

    // Apply 3D rotation transform
    cube.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;

    // Feedback update during spin
    bannerText.textContent = "¡Lanzando el cubo...";
    messageBanner.classList.remove('highlight');

    // Remove previous active face highlight
    cubeFaces.forEach(face => face.classList.remove('active-face'));

    // Wait for the animation duration (0.9s matching CSS transition)
    setTimeout(() => {
      isRolling = false;
      rollBtn.disabled = false;
      rollBtn.style.cursor = 'pointer';

      // Highlight active face
      cubeFaces[targetIndex].classList.add('active-face');

      // Update message banner with landed quote
      const result = faceData[targetIndex];
      bannerText.textContent = `"${result.text}"`;

      // Trigger highlight animation on banner
      messageBanner.classList.add('highlight');
    }, 900);
  }

  // Event Listener
  rollBtn.addEventListener('click', rollCube);
});
