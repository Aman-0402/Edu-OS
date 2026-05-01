from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.serializers import UserCreateSerializer, UserListSerializer, UserDetailSerializer
from utils.permissions import IsAdmin


@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def user_list_create_view(request):
    if request.method == 'GET':
        role = request.query_params.get('role')
        search = request.query_params.get('search', '').strip()

        qs = User.objects.all().order_by('-date_joined')
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(
                first_name__icontains=search
            ) | qs.filter(
                last_name__icontains=search
            ) | qs.filter(
                email__icontains=search
            )

        serializer = UserListSerializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})

    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def user_detail_view(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserDetailSerializer(user).data)

    if request.method in ('PUT', 'PATCH'):
        partial = request.method == 'PATCH'
        serializer = UserDetailSerializer(user, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE — soft delete
    user.is_active = False
    user.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)
