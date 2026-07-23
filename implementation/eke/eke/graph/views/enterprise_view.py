#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Enterprise View
Domain-specific view of CanonicalGraph
"""
from __future__ import annotations
from typing import List, Optional
from eke.graph.canonical_graph import CanonicalGraph
from eke.graph.graph_node import GraphNode


class EnterpriseView:
    def __init__(self, graph: CanonicalGraph):
        self.graph = graph

    # Typed traversal API: enterprise-specific methods
    def capabilities(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="BusinessCapability")

    def business_services(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="BusinessService")

    def platform_capabilities(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="PlatformCapability")

    def actors(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="Actor")

    def policies(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="Policy")

    def evidence(self) -> List[GraphNode]:
        return self.graph.find_nodes(type="Evidence")

    def realizations(self, capability: GraphNode) -> List[GraphNode]:
        return self.graph.successors(capability, edge_type="realizes")

    def implementations(self, service: GraphNode) -> List[GraphNode]:
        return self.graph.successors(service, edge_type="implemented_by")

    def owners(self, obj: GraphNode) -> List[GraphNode]:
        return self.graph.predecessors(obj, edge_type="owns")

    def governors(self, obj: GraphNode) -> List[GraphNode]:
        return self.graph.predecessors(obj, edge_type="governs")
