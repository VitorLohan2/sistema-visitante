import {
  blue,
  red,
  green,
  orange,
  slate,
  yellow,
  tomato,
  cyan,
  teal,
  jade,
  grass,
  mint,
  lime,
  sky,
} from "@radix-ui/colors";

export function injectRadixColors() {
  const root = document.documentElement;

  const paletas = [
    yellow,
    orange,
    tomato,
    red,
    blue,
    cyan,
    teal,
    jade,
    green,
    grass,
    lime,
    mint,
    sky,
    slate,
  ];

  paletas.forEach((paleta) => {
    Object.entries(paleta).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  });
}
