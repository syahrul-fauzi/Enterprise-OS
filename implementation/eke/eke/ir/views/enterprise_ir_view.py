#!/usr/bin/env python3
"""
Enterprise Knowledge Engine — Enterprise IR View
Domain-specific view of EnterpriseIR
"""
from __future__ import annotations
from typing import List, Optional
from eke.ir import EnterpriseIR, IRObject, IRRelationship


class EnterpriseIRView:
    def __init__(self, ir: EnterpriseIR):
        self.ir = ir

    # Forward query API methods from EnterpriseIR
    def get_object(self, obj_id: str) -> Optional[IRObject]:
        return self.ir.get_object(obj_id)

    def find_objects(self, type: Optional[str] = None) -> List[IRObject]:
        return self.ir.find_objects(type)

    def find_relationships(self, type: Optional[str] = None) -> List[IRRelationship]:
        return self.ir.find_relationships(type)

    def outgoing_relationships(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRRelationship]:
        return self.ir.outgoing_relationships(obj, rel_type)

    def incoming_relationships(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRRelationship]:
        return self.ir.incoming_relationships(obj, rel_type)

    def successors(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRObject]:
        return self.ir.successors(obj, rel_type)

    def predecessors(self, obj: IRObject, rel_type: Optional[str] = None) -> List[IRObject]:
        return self.ir.predecessors(obj, rel_type)

    # Typed traversal API: enterprise-specific methods
    def capabilities(self) -> List[IRObject]:
        return self.find_objects(type="BusinessCapability")

    def business_services(self) -> List[IRObject]:
        return self.find_objects(type="BusinessService")

    def platform_capabilities(self) -> List[IRObject]:
        return self.find_objects(type="PlatformCapability")

    def actors(self) -> List[IRObject]:
        return self.find_objects(type="Actor")

    def policies(self) -> List[IRObject]:
        return self.find_objects(type="Policy")

    def evidence(self) -> List[IRObject]:
        return self.find_objects(type="Evidence")

    def realizations(self, capability: IRObject) -> List[IRObject]:
        return self.successors(capability, rel_type="realizes")

    def implementations(self, service: IRObject) -> List[IRObject]:
        return self.successors(service, rel_type="implemented_by")

    def owners(self, obj: IRObject) -> List[IRObject]:
        return self.predecessors(obj, rel_type="owns")

    def governors(self, obj: IRObject) -> List[IRObject]:
        return self.predecessors(obj, rel_type="governs")
