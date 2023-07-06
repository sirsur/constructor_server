import { Request, Response } from "express";

export type RequestContext = {
    req: Request;
    res: Response;
};
