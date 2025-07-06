// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  declare module "*?base64" {
    const content: string;
    export = content;
  }

  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
