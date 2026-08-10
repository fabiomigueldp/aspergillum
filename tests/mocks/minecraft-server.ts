export const system = {
  run(callback: () => void): number {
    callback();
    return 0;
  },
};
