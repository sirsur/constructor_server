import { Project } from '../entities/project';
import { ProjectModel, UserModel } from './../index';
import { addProject } from './types/addProject';
import { changeProjectInfo } from './types/changeProjectInfo';
import { saveProjectCode } from './types/saveProjectCode';
import { setImage } from './types/setImage';
// import { getImage } from './types/getImage';
import { 
    Resolver, 
    Mutation,
    Arg,
    Ctx,
    Query,
    ObjectType,
    Field
} from 'type-graphql';
import { RequestContext } from '../context';
import { ApolloError } from 'apollo-server-express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

require('dotenv').config(); 
// const projectAccessSecret: string = process.env.PROJECT_ACCESS_SECRET!;
// const projectRefreshSecret: string = process.env.PROJECT_REFRESH_SECRET!;

@ObjectType()
class Projects {
  @Field(() => [Project])
  projects: Project[];
}

@ObjectType()
class Images {
  @Field(() => [String])
  images: String[];

  @Field(() => [String])
  imagesComponents: String[];
}

@Resolver(Project)
export class projectResolver {
    @Mutation(() => String)
    async createProject(
        @Arg('input') { name }: addProject,
        @Ctx() { req }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }
        const userIdToken = user.id;
        const repeatName = await ProjectModel.findOne({ userId: userIdToken, name: name });
        if (repeatName) {
            throw new ApolloError('Project already exist', 'PROJECT_ALREADY_EXIST');
        }
        const newProject = new ProjectModel({
            name: name!,
            dateCreate: format(new Date(), 'HH:mm:ss dd MMM yyyy'),
            dateUpdate: format(new Date(), 'HH:mm:ss dd MMM yyyy'),
            userId: userIdToken,
            uuid: uuidv4(),
            code: '<head><meta charset=utf-8></head><body style="margin: 0;"></body>'
        });
        await newProject.save();
        const newProjectId = newProject.id;
        const project = await ProjectModel.findOne({ _id: newProjectId });
        if (!project) {
            throw new ApolloError('Can`t find project', 'PROJECT_NOT_EXISTS'); 
        }
        const projectId = project.id;
        user.projects?.push(projectId);
        await user.save();

        const projectUUID = project.uuid;
        return projectUUID;
    }

    @Query(() => Projects)
    async getProjectsByUserId(
        @Ctx() { req }: RequestContext
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }
        const userIdToken = user.id;
        const allProjects = await ProjectModel.find({ userId: userIdToken });

        return {
            projects: allProjects
        };
    }

    @Mutation(() => Boolean)
    async changeProjectInfo(
        @Arg('input') { newName, oldName }: changeProjectInfo,
        @Ctx() { req }: RequestContext
    ) {
        if (newName === oldName) {
            throw new ApolloError('You can`t use old name again', 'OLD_NAME'); 
        }

        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        } 
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }

        const userIdToken = user.id;
        const repeatName = await ProjectModel.findOne({ userId: userIdToken, name: newName });
        if (repeatName) {
            throw new ApolloError('Project already exist', 'PROJECT_ALREADY_EXIST'); 
        }

        const findProject = await ProjectModel.findOne({ userId: userIdToken, name: oldName });
        if (!findProject) {
            throw new ApolloError('Can`t find project', 'PROJECT_NOT_EXISTS'); 
        }
        findProject.name = newName;
        findProject.dateUpdate = format(new Date(), 'HH:mm:ss dd MMM yyyy');
        await findProject.save();

        return true;
    }

    @Mutation(() => Boolean)
    async deleteProject(
        @Ctx() { req }: RequestContext,
        @Arg('input') { name }: addProject
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        }
        
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }

        const userIdToken = user.id;
        const findProject = await ProjectModel.findOne({ userId: userIdToken, name: name });
        if (!findProject) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_DELETE_ERROR'); 
        }

        const projectId = findProject.id;
        await findProject.remove();
        const index = user.projects!.indexOf(projectId);
        user.projects!.splice(index, 1);
        await user.save();

        return true;
    }

    // можно наверно угадать id проекта поэтому нужно проверять на соответствие преокта и пользователя
    @Query(() => Boolean)
    async checkProjectForUser(
        @Ctx() { req }: RequestContext,
        @Arg('id')
        id: string
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        }
        
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }

        const userIdToken = user.id;
        const findProject = await ProjectModel.findOne({ userId: userIdToken, uuid: id });
        if (!findProject) {
            throw new ApolloError('There is no such project for this user', 'PROJECT_FIND_ERROR'); 
        }

        return true;
    }

    // функция отображения имени проекта
    @Query(() => String)
    async getProjectName(
        @Arg('id')
        id: string
    ) {
        const project = await ProjectModel.findOne({ id: id });
        if (!project) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        const name = project.name;
        return name;
    }

    // функция сохранения результатов проекта
    @Mutation(() => Boolean)
    async saveProjectCode(
        @Arg('input') { code, id }: saveProjectCode
    ) {
        const project = await ProjectModel.findOne({ uuid: id });
        if (!project) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        
        project.dateUpdate = format(new Date(), 'HH:mm:ss dd MMM yyyy');
        project.code = code;
        await project.save();
        
        return true;
    }

    @Query(() => String)
    async getProjectCode(
        @Ctx() { req }: RequestContext,
        @Arg('name') name: string
    ) {
        if (req.cookies['accessToken'] == undefined || req.cookies['accessToken'] == '') {
            throw new ApolloError('There is no access token in headers'); 
        }
        
        const accessToken = req.cookies['accessToken'];
        const decoded = jwt.decode(accessToken) as JwtPayload;
        const usernameToken = decoded.username;
        const user = await UserModel.findOne({ usernameToken });
        if (!user) {
            throw new ApolloError('Can`t find user', 'USER_NOT_EXISTS'); 
        }

        const userIdToken = user.id;
        const findProject = await ProjectModel.findOne({ userId: userIdToken, name: name });
        if (!findProject) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        const code = findProject.code;
        return code;
    }

    @Query(() => String, { nullable: true })
    async getProjectCodeById(
        @Arg('id')
        id: string
    ) {
        const project = await ProjectModel.findOne({ uuid: id });
        if (!project) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        const code = project.code;
        return code;
    }

    @Mutation(() => Boolean)
    async setImageToProject(
        @Arg('input') { image, id, imageComponent }: setImage
    ) {
        const project = await ProjectModel.findOne({ uuid: id });
        if (!project) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        project.images?.push(image);
        project.imagesComponents?.push(imageComponent);
        await project.save();
        return true;
    }

    @Query(() => Images, { nullable: true })
    async getImagesFromProject(
        @Arg('id') id: string
    ) {
        const project = await ProjectModel.findOne({ uuid: id });
        if (!project) {
            throw new ApolloError('Something went wrong, please try again', 'PROJECT_FIND_ERROR'); 
        }
        return {
            images: project.images,
            imagesComponents: project.imagesComponents
        };
    }
}
