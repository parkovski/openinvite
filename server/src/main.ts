import 'dotenv/config';
import bcrypt from 'bcrypt';
import serve from './server.js';

const commands = {
  serve() {
    const port: number = +(process.argv[3] || process.env.SERVER_PORT || 3000);
    serve(port);
  },

  async hash() {
    const password = process.argv[3];
    if (!password) {
      console.log('Expected password');
      process.exit(1);
    }
    console.log(await bcrypt.hash(password, 10));
  },

  help() {
    console.log(
`Commands:
  serve <port>
  hash <password>`
    );
  },
};

const command = process.argv[2];
if (!command) {
  commands.serve();
} else if (command in commands) {
  (commands as any)[command]();
} else {
  commands.help();
}
