// graphics engine

export const canvas = document.createElement('canvas');
export const ctx = canvas.getContext('2d');

const canvasRoot = document.getElementById('canvasRoot');

if (canvasRoot === null) throw new TypeError('Canvas root was not found');
canvasRoot