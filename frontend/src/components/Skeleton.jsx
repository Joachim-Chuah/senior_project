import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => (
    <div
        className={`skeleton rounded-lg ${className}`}
        style={style}
    />
);

export const SkeletonCard = () => (
    <div
        className="rounded-xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
        <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full mb-2" />
        <div className="flex justify-between">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-12" />
        </div>
    </div>
);

export const SkeletonNewsItem = () => (
    <div className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-24" />
    </div>
);
