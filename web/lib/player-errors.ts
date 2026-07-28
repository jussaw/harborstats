export class DuplicatePlayerNameError extends Error {
  constructor(playerName: string) {
    super(`A player named "${playerName}" already exists`);
    this.name = 'DuplicatePlayerNameError';
  }
}
