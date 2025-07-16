import dotenv from 'dotenv';
dotenv.config();

export const config = {
  db: {
    user: process.env.USERORACLE,
    password: process.env.SENHA,
    connectString: `${process.env.HOST}:${process.env.PORTA}/${process.env.DATABASE}`,
    schema: process.env.SCHEMA
  },
  basePath: process.env.PASTA_REDE.replace(/"/g, '')
};
