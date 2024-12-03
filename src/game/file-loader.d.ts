// https://stackoverflow.com/questions/38715001/how-to-make-web-workers-with-typescript-and-webpack

declare module "file-loader?name=[name].js!*" {
    const value: string;
    export = value;
}