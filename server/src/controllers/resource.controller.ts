import * as resourceService from '../services/resource.service';
import { serializeResource } from '../serializers';
import { asyncHandler } from '../utils/asyncHandler';
import { requireActor } from '../utils/request';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/pagination';

export const createResource = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const resource = await resourceService.createResource(req.body, actor);
  sendSuccess(res, 'Resource created.', { resource: serializeResource(resource) }, 201);
});

export const listResources = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const { resources, total, page, limit } = await resourceService.listResources(
    req.query as never,
    actor,
  );
  sendSuccess(res, 'Resources loaded.', {
    resources: resources.map(serializeResource),
    pagination: paginationMeta(total, { page, limit, skip: (page - 1) * limit }),
  });
});

export const getResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.getResource(req.params.id);
  sendSuccess(res, 'Resource loaded.', { resource: serializeResource(resource) });
});

export const updateResource = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const resource = await resourceService.updateResource(req.params.id, req.body, actor);
  sendSuccess(res, 'Resource updated.', { resource: serializeResource(resource) });
});

export const dispatchResource = asyncHandler(async (req, res) => {
  const actor = requireActor(req);
  const result = await resourceService.dispatchResource(req.params.id, req.body, actor);
  sendSuccess(res, 'Resource dispatched.', {
    resource: serializeResource(result.resource),
    dispatch: result.dispatch,
  });
});
