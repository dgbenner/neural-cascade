import { isAuthed } from "./lib/auth";
import LoginForm from "./components/LoginForm";
import BrainViz from "./components/BrainViz";

export default async function Page() {
  const authed = await isAuthed();
  return authed ? <BrainViz /> : <LoginForm />;
}
