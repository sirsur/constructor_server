import { User } from '../entities/user';
import { UserModel } from './../index';
import { TokenModel } from '../entities/token';
import { ProjectModel } from './../index';
import { registration } from './types/registration';
import { login } from './types/login';
import { forgotPassword } from './types/forgotPassword';
import { changePassword } from './types/changePassword';
import { deleteAccount } from './types/deleteAccount';
import { changeUsername } from './types/changeUsername';
import { 
    Resolver, 
    Mutation,
    Arg,
    Query,
    Ctx
} from 'type-graphql';
import argon2 from "argon2";
import { ApolloError } from 'apollo-server-express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../context';
import nodemailer from 'nodemailer';
import handlebars from "handlebars";
import path from 'path';
import fs from 'fs';

require('dotenv').config(); 
const accessSecret: string = process.env.ACCESS_SECRET!;
const refreshSecret: string = process.env.REFRESH_SECRET!;
const emailSecret: string = process.env.EMAIL_SECRET!;
const validationSecret: string = process.env.VALIDATION_SECRET!;

const fromEmail: string = process.env.EMAIL!;
const password: string = process.env.PASSWORD!;
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    secure: true,
    port: 465,
    auth: {
        user: fromEmail,
        pass: password,
    },
    tls: {
        rejectUnauthorized: false,
    }
});
const filePath = path.join(__dirname, '../resolvers/views/email.html');
const source = fs.readFileSync(filePath, 'utf-8').toString();

const filePathValidation = path.join(__dirname, '../resolvers/views/validation.html');
const sourceValidation = fs.readFileSync(filePathValidation, 'utf-8').toString();

// in mail.ru link don't work

@Resolver(User)
export class userResolvers {
    @Query(() => Boolean)
    async register(
        @Arg("input") { username, email, password }: registration
    ) {
        const oldName = await UserModel.findOne({ username });
        if (oldName) {
            throw new ApolloError('User already exists with username ' + username, 'USER_ALREADY_EXISTS');
        }
        const oldEmail = await UserModel.findOne({ email });
        if (oldEmail) {
            throw new ApolloError('User already exists with email ' + email, 'USER_ALREADY_EXISTS');
        }

        const hashedPassword = await argon2.hash(password);

        const token = jwt.sign(
            {
                username,
                email,
                hashedPassword
            },
            validationSecret,
            {
                algorithm: 'HS256',
                expiresIn: '5m',
                jwtid: uuidv4()
            }
        );
        
        const toEmail = email;
        const link = `http://localhost:3000/emailValidation/${token}`;
        const template = handlebars.compile(sourceValidation);
        const replacements = {
            link: link
        };
        const htmlToSend = template(replacements);
        try {
            transporter.sendMail({
                from: fromEmail,
                to: toEmail,
                subject: 'Verify email',
                html: htmlToSend
            });
        } catch (error) {
            throw new ApolloError('Email not sent'); 
        }
        return true;
    };

    @Mutation(() => Boolean, { nullable: true })
    async emailValidation(
        @Ctx() { res }: RequestContext,
        @Arg('token') token: string
    ) {
        try {
            const tokenDecoded = jwt.verify(token, validationSecret) as JwtPayload;
            const username = tokenDecoded.username;
            const email = tokenDecoded.email;
            const hashedPassword = tokenDecoded.hashedPassword;

            const accessToken = jwt.sign(
                {
                    username,
                    email,
                    hashedPassword
                },
                accessSecret,
                {
                    algorithm: 'HS256',
                    expiresIn: '30m',
                    jwtid: uuidv4()
                }
            );
            const refreshToken = jwt.sign(
                {
                    username,
                    email,
                    hashedPassword
                },
                refreshSecret,
                {
                    algorithm: 'HS256',
                    expiresIn: '1h',
                    jwtid: uuidv4()
                }
            );

            const newUser = new UserModel({
                username: username!,
                email: email!,
                password: hashedPassword,
                accessToken: accessToken
            });

            const userToken = new TokenModel({
                user: newUser.id,
                refreshToken: refreshToken
            });

            await newUser.save();
            await userToken.save();

            const user = await UserModel.findOne({ email });
            if (user) {
                res.cookie('accessToken', accessToken, {
                        httpOnly: true,
                        maxAge: 3600000
                    })
                return true; 
            } else {
                throw new ApolloError('Registration error', 'REGISTRATION_ERROR');
            }
        } catch {
            throw new ApolloError('Registration error', 'REGISTRATION_ERROR');
        }
    }

    @Mutation(() => User, { nullable: true })
    async login(
        @Arg('input') { username, password }: login,
        @Ctx() { res }: RequestContext
    ) {
        const user = await UserModel.findOne({ username });
        if (!user) {
            throw new ApolloError('User does not exist with username ' + username, 'USER_NOT_EXISTS'); 
        }
        if (!await argon2.verify(user.password, password)) {
            throw new ApolloError('Incorrect password', 'INCORRECT_PASSWORD');
        }
        const email = user.email;
        const hashedPassword = user.password;

        const userId = user.id;
        const token = await TokenModel.findOne({ userId });
        if (!token) {
            throw new ApolloError('Server token error', 'TOKEN_ERROR'); 
        }

        const accessToken = jwt.sign(
            {
                username,
                email,
                hashedPassword
            },
            accessSecret,
            {
                algorithm: 'HS256',
                expiresIn: '30m',
                jwtid: uuidv4()
            }
        );
        const refreshToken = jwt.sign(
            {
                username,
                email,
                hashedPassword
            },
            refreshSecret,
            {
                algorithm: 'HS256',
                expiresIn: '1h',
                jwtid: uuidv4()
            }
        );

        user.accessToken = accessToken;
        token.refreshToken = refreshToken;

        await user.save();
        await token.save();

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            maxAge: 3600000
        });

        return user;
    };

    @Mutation(() => Boolean)
    logout(@Ctx() { res }: RequestContext) {
        res.clearCookie('accessToken');
        return true;
    }

    @Query(() => Boolean)
    async refreshToken(
        @Ctx() { req, res }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const username = decoded.username;
        const user = await UserModel.findOne({ username });
        if (!user) {
            throw new ApolloError('Can`t find userId with username ' + username); 
        }
        const userId = user.id;
        const token = await TokenModel.findOne({ userId });
        if (!token) {
            throw new ApolloError('Can`t find refresh token for user'); 
        }
        const refreshToken = token.refreshToken;
        const refreshTokenDecoded = jwt.decode(refreshToken) as JwtPayload;
        const expRefreshToken = refreshTokenDecoded.exp;
        if (expRefreshToken) {
            if (Date.now() / 1000 < expRefreshToken) {
                const username = user.username;
                const email = user.email;
                const password = user.password;
                const accessToken = jwt.sign(
                    {
                        username,
                        email,
                        password
                    },
                    accessSecret,
                    {
                        algorithm: 'HS256',
                        expiresIn: '30m',
                        jwtid: uuidv4()
                    }
                );
                user.accessToken = accessToken;
                await user.save();
                res.cookie('accessToken', accessToken, {
                    httpOnly: true,
                    maxAge: 3600000
                });
                return true;
            } else {
                res.clearCookie('accessToken');
                return false;
            }
        } else {
            return false;
        }
    }

    @Query(() => Boolean)
    isAuth(
        @Ctx() { req }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            return false;
        } else {
            let accessToken = req.cookies['accessToken'];
            const accessTokenDecoded = jwt.verify(accessToken, accessSecret) as JwtPayload;
            const expAccessToken = accessTokenDecoded.exp;
            if(expAccessToken) {
                if(Date.now() / 1000 < expAccessToken) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }
    }

    @Query(() => String)
    getUsernameByUserId(
        @Ctx() { req }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const username = decoded.username;
        return username;
    }

    @Query(() => String)
    getEmailByUserId(
        @Ctx() { req }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const email = decoded.email;
        return email;
    }

    @Query(() => Boolean)
    async sendLink(
        @Arg("input") { emailLink }: forgotPassword,
        @Ctx() { req }: RequestContext
    ) {
        let toEmail;
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            toEmail = emailLink;
        } else {
            const accessToken = req.cookies['accessToken'];
            const decoded = jwt.decode(accessToken) as JwtPayload;
            toEmail = decoded.email;
        }
        const user = await UserModel.findOne({ toEmail });
        if (!user) {
            throw new ApolloError('Can`t find userId with email ' + toEmail); 
        }
        const emailToken = jwt.sign(
            {
                toEmail

            },
            emailSecret,
            {
                algorithm: 'HS256',
                expiresIn: '5m',
                jwtid: uuidv4()
            }
        );
        const link = `http://localhost:3000/changePassword/${emailToken}`;
        const template = handlebars.compile(source);
        const replacements = {
            link: link
        };
        const htmlToSend = template(replacements);
        try {
            transporter.sendMail({
                from: fromEmail,
                to: toEmail,
                subject: 'Password change request',
                html: htmlToSend
            });
        } catch (error) {
            throw new ApolloError('Email not sent'); 
        }
        return true;
    }

    @Mutation(() => Boolean)
    async changePassword (
        @Arg("input") { newPassword, token }: changePassword
    ) {
        try {
            const tokenDecoded = jwt.verify(token, emailSecret) as JwtPayload;
            const expToken = tokenDecoded.exp;
            if(expToken) {
                if(Date.now() / 1000 < expToken) {
                    const email = tokenDecoded.toEmail;
                    const user = await UserModel.findOne({ email });
                    if (!user) {
                        throw new ApolloError('Can`t find user with email ' + email); 
                    }
                    if (await argon2.verify(user.password, newPassword)) {
                        throw new ApolloError('You cannot change the password to a previously used one');
                    }
                    const hashedPassword = await argon2.hash(newPassword);
                    user.password = hashedPassword;
                    await user.save();
                    return true;
                } else {
                    throw new ApolloError('Your link is expired');
                }
            } else {
                throw new ApolloError('Error occured');
            }
        } catch {
            throw new ApolloError('Error occured');
        }
    }

    @Mutation(() => Boolean)
    async deleteAccount (
        @Arg("input") { toEmail }: deleteAccount
    ) {
        try {
            const user = await UserModel.findOne({ toEmail });
            if (!user) {
                throw new ApolloError('Can`t find userId with email ' + toEmail); 
            }
            const userId = user.id;
            const refreshToken = await TokenModel.findOne({ userId });
            if (!refreshToken) {
                throw new ApolloError('Can`t find token for user'); 
            }

            await ProjectModel.deleteMany({ userId: userId });
            await refreshToken.remove();
            await user.remove();
            return true;
        } catch {
            throw new ApolloError('Error occured');
        }
    }

    @Mutation(() => Boolean)
    async changeUsername (
        @Arg('input') { newName, oldName }: changeUsername,
        @Ctx() { req }: RequestContext
    ) {
        try {
            if (newName === oldName) {
                throw new ApolloError('You can`t use old name again', 'OLD_NAME'); 
            }

            if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
                throw new ApolloError('There is no access token in headers'); 
            } 
            const accessToken = req.cookies['accessToken'];
            const decoded = jwt.decode(accessToken) as JwtPayload;
            const decodedUsername = decoded.username;
            const user = await UserModel.findOne({ decodedUsername });
            if (!user) {
                throw new ApolloError('Can`t find userId with username ' + decodedUsername); 
            }
            user.username = newName;
            await user.save();
            return true;
        } catch {
            throw new ApolloError('Error occured');
        }
    }
};
