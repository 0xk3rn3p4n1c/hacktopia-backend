export interface UserInterface {
  userId: string;
  email: string;
  password: string;
}

export interface GoogleAuthInterface extends Request {
  user: any;
}
