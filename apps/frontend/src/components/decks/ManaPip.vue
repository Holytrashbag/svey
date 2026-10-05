<script setup lang="ts">
import { computed } from "vue";

// Mana.svg is a 10×7 grid (last row skipped), each cell is 100×100 units
// Grid origin: col 0 → cx=-895, row 0 → cy=-160; step = 105 per cell
const SVG_ORIGIN_X = -945;
const SVG_ORIGIN_Y = -210.002;
const SVG_WIDTH = 1045;
const SVG_HEIGHT = 730.002;

const cell = (col: number, row: number): [number, number] => [
  -895 + col * 105,
  -160 + row * 105,
];

// Row 0: 0–9  |  Row 1: 10–19  |  Row 2: 20 X Y Z W U B R G S
// Row 3: hybrid pairs  |  Row 4: 2-hybrid + phyrexian  |  Row 5: utility
const SYMBOL_MAP: Record<string, [number, number]> = {
  "0": cell(0, 0), "1": cell(1, 0), "2": cell(2, 0), "3": cell(3, 0), "4": cell(4, 0),
  "5": cell(5, 0), "6": cell(6, 0), "7": cell(7, 0), "8": cell(8, 0), "9": cell(9, 0),
  "10": cell(0, 1), "11": cell(1, 1), "12": cell(2, 1), "13": cell(3, 1), "14": cell(4, 1),
  "15": cell(5, 1), "16": cell(6, 1), "17": cell(7, 1), "18": cell(8, 1), "19": cell(9, 1),
  "20": cell(0, 2), X: cell(1, 2), Y: cell(2, 2), Z: cell(3, 2),
  W: cell(4, 2), U: cell(5, 2), B: cell(6, 2), R: cell(7, 2), G: cell(8, 2), S: cell(9, 2),
  "W/U": cell(0, 3), "W/B": cell(1, 3), "U/B": cell(2, 3), "U/R": cell(3, 3), "B/R": cell(4, 3),
  "B/G": cell(5, 3), "R/W": cell(6, 3), "R/G": cell(7, 3), "G/W": cell(8, 3), "G/U": cell(9, 3),
  "2/W": cell(0, 4), "2/U": cell(1, 4), "2/B": cell(2, 4), "2/R": cell(3, 4), "2/G": cell(4, 4),
  "P/W": cell(5, 4), "P/U": cell(6, 4), "P/B": cell(7, 4), "P/R": cell(8, 4), "P/G": cell(9, 4),
  // Scryfall puts color first: {W/P} = Phyrexian White, etc.
  "W/P": cell(5, 4), "U/P": cell(6, 4), "B/P": cell(7, 4), "R/P": cell(8, 4), "G/P": cell(9, 4),
  T: cell(0, 5), Q: cell(1, 5),
};

const DEFAULT_COORDS = cell(1, 2); // X as fallback for unknown symbols

const props = withDefaults(
  defineProps<{
    sym: string;
    size?: number;
  }>(),
  { size: 20 },
);

const spriteStyle = computed(() => {
  const [cx, cy] = SYMBOL_MAP[props.sym] ?? DEFAULT_COORDS;
  const scale = props.size / 100;
  return {
    backgroundImage: "url(/Mana.svg)",
    backgroundSize: `${SVG_WIDTH * scale}px ${SVG_HEIGHT * scale}px`,
    backgroundPosition: `${-(cx - 50 - SVG_ORIGIN_X) * scale}px ${-(cy - 50 - SVG_ORIGIN_Y) * scale}px`,
    backgroundRepeat: "no-repeat",
    width: `${props.size}px`,
    height: `${props.size}px`,
  };
});
</script>

<template>
  <div
    class="inline-block shrink-0 rounded-full shadow-[inset_0_-1px_0_rgba(0,0,0,0.18)]"
    :style="spriteStyle"
  />
</template>
