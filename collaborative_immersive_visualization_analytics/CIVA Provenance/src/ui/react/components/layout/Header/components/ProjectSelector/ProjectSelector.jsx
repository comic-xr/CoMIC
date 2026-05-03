/**
 * @file ProjectSelector.jsx
 * @description Dropdown for selecting/creating projects.
 */

import React, { useState, useMemo } from 'react';
import { Icon } from '@UI/react/components/atoms';
import { LabeledButton } from '@UI/react/components/molecules';
import { SearchInput } from '@UI/react/components/molecules/SearchInput';
import { Dropdown } from '@UI/react/components/atoms/Dropdown';

/**
 * Project selector dropdown component.
 *
 * @param {Object} props - Component props
 * @param {Object} [props.currentProject] - Currently selected project
 * @param {Array} [props.projects] - List of available projects
 * @param {Function} [props.onSelect] - Callback when project is selected
 * @param {Function} [props.onCreate] - Callback to create new project
 */
export function ProjectSelector({
    currentProject,
    projects = [],
    onSelect,
    onCreate,
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const recentProjects = useMemo(() => {
        return projects
            .filter((p) => p.lastAccessed)
            .sort(
                (a, b) =>
                    new Date(b.lastAccessed) - new Date(a.lastAccessed)
            )
            .slice(0, 5);
    }, [projects]);

    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        const term = searchTerm.toLowerCase();
        return projects.filter((p) =>
            p.name.toLowerCase().includes(term)
        );
    }, [projects, searchTerm]);

    const handleSelect = (project) => {
        onSelect?.(project);
    };

    const handleCreate = () => {
        onCreate?.();
    };

    return (
        <Dropdown
            trigger={
                <button className="project-selector__trigger" type="button">
                    <Icon name="folder" size={16} />
                    <span className="project-selector__name">
                        {currentProject?.name || 'Select Project'}
                    </span>
                    <Icon name="chevronDown" size={14} />
                </button>
            }
            placement="bottom-start"
        >
            <div className="project-selector__dropdown">
                {/* Search */}
                <SearchInput
                    className="project-selector__search"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Search projects..."
                    size="sm"
                    autoFocus
                />

                {/* Recent Projects */}
                {!searchTerm && recentProjects.length > 0 && (
                    <div className="project-selector__section">
                        <div className="project-selector__section-header">
                            <Icon name="clock" size={12} />
                            Recent
                        </div>
                        {recentProjects.map((project) => (
                            <button
                                key={project.id}
                                className={`project-selector__item ${project.id === currentProject?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => handleSelect(project)}
                                type="button"
                            >
                                {project.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* All Projects */}
                <div className="project-selector__section">
                    <div className="project-selector__section-header">
                        All Projects
                    </div>
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <button
                                key={project.id}
                                className={`project-selector__item ${project.id === currentProject?.id
                                        ? 'active'
                                        : ''
                                    }`}
                                onClick={() => handleSelect(project)}
                                type="button"
                            >
                                {project.name}
                            </button>
                        ))
                    ) : (
                        <div className="project-selector__empty">
                            {searchTerm
                                ? 'No projects found'
                                : 'No projects yet'}
                        </div>
                    )}
                </div>

                {/* Create New */}
                <div className="project-selector__footer">
                    <LabeledButton
                        icon="add"
                        label="New Project"
                        onClick={handleCreate}
                        variant="ghost"
                        size="sm"
                        className="project-selector__create"
                    />
                </div>
            </div>
        </Dropdown>
    );
}

export default ProjectSelector;
